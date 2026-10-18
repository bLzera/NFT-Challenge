import { expect, test } from "@playwright/test";
import { gotoWithScenario, setScenario } from "./support/mock";

/**
 * Fluxo §9.12 — skeletons em carregamento lento; feedback de falha com retry e recuperação.
 * Desktop-only (estados de carregamento/erro idênticos no mobile; não é fluxo principal do §9 mapa).
 */
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop-only");
});

test.describe("estados de carregamento e erro", () => {
  test("cenário lento mostra skeletons de carregamento antes dos dados", async ({ page }) => {
    await gotoWithScenario(page, "/", { scenario: "slow", seed: 1 });

    // Durante o carregamento lento (latência 1500–2200ms) o estado de loading é anunciado (role=status
    // aria-busy) com skeletons — antes dos cards reais aparecerem.
    const loading = page.getByRole("status").filter({ has: page.locator("[aria-busy='true']") });
    await expect(page.locator("[aria-busy='true']").first()).toBeVisible();
    await expect(page.getByText("Carregando NFTs…")).toBeAttached();

    // E, ao fim, os dados reais chegam (recuperação natural da latência).
    await expect(page.getByTestId("nft-card").first()).toBeVisible({ timeout: 15_000 });
    void loading;
  });

  test("falha de rede (offline) mostra erro com retry e recupera ao tentar de novo", async ({
    page,
  }) => {
    await gotoWithScenario(page, "/", { scenario: "offline", seed: 1 });

    // Sem dados em cache, a falha vira um ErrorState (role=alert) com botão de retry.
    const alert = page.getByRole("alert");
    await expect(alert.first()).toBeVisible({ timeout: 15_000 });
    const retry = page.getByRole("button", { name: "Tentar novamente" });
    await expect(retry).toBeVisible();

    // Volta ao cenário saudável e tenta de novo → a grade carrega (recuperação).
    await setScenario(page, "default");
    await retry.click();
    await expect(page.getByTestId("nft-card").first()).toBeVisible({ timeout: 15_000 });
  });

  test("erro transitório (http-5xx) mostra retry e recupera após nova tentativa", async ({
    page,
  }) => {
    await gotoWithScenario(page, "/", { scenario: "http-5xx", seed: 1 });

    await expect(page.getByRole("alert").first()).toBeVisible({ timeout: 15_000 });
    const retry = page.getByRole("button", { name: "Tentar novamente" });
    await expect(retry).toBeVisible();

    await setScenario(page, "default");
    await retry.click();
    await expect(page.getByTestId("nft-card").first()).toBeVisible({ timeout: 15_000 });
  });
});
