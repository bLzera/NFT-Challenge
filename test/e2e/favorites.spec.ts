import { expect, test } from "@playwright/test";
import { waitForMock } from "./support/mock";
import { loginViaUI } from "./support/auth";

/**
 * Fluxo §9.4 — favoritar/desfavoritar e falha de mutation com rollback.
 * Desktop-only: exercita o toggle otimista no detalhe (aria-pressed) e na tela /favorites; não é
 * fluxo principal do §9 mapa.
 */
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop-only");
});

// nft-002 (neon-apes-2) NÃO está nos favoritos semeados de Ava (nft-001, nft-013).
const NOT_FAVORITED_SLUG = "neon-apes-2";

test.describe("favoritos", () => {
  test("favoritar e desfavoritar reflete no botão (aria-pressed)", async ({ page }) => {
    await loginViaUI(page, "collector", {
      scenario: "default",
      seed: 1,
      redirect: `/nft/${NOT_FAVORITED_SLUG}`,
    });
    await expect(page.getByTestId("nft-detail")).toBeVisible();

    const favButton = page.getByRole("button", { name: "Favoritar" });
    await expect(favButton).toBeVisible();
    await expect(favButton).toHaveAttribute("aria-pressed", "false");

    // Favorita → estado reflete (botão vira "Favoritado", aria-pressed=true).
    await favButton.click();
    const favorited = page.getByRole("button", { name: "Remover dos favoritos" });
    await expect(favorited).toBeVisible();
    await expect(favorited).toHaveAttribute("aria-pressed", "true");

    // Desfavorita → volta ao estado inicial.
    await favorited.click();
    await expect(page.getByRole("button", { name: "Favoritar" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  test("favorito aparece na lista /favorites após favoritar", async ({ page }) => {
    await loginViaUI(page, "collector", {
      scenario: "default",
      seed: 1,
      redirect: `/nft/${NOT_FAVORITED_SLUG}`,
    });
    await expect(page.getByTestId("nft-detail")).toBeVisible();

    // Clica favoritar e aguarda a resposta real do servidor (persistência) antes de recarregar — o
    // toggle é otimista; sem esperar a resposta, um full reload re-hidrataria o estado semeado.
    const [toggleResponse] = await Promise.all([
      page.waitForResponse(
        (r) => /\/favorites\/toggle|\/favorites/.test(r.url()) && r.request().method() === "POST",
      ),
      page.getByRole("button", { name: "Favoritar" }).click(),
    ]);
    expect(toggleResponse.ok()).toBeTruthy();
    await expect(page.getByRole("button", { name: "Remover dos favoritos" })).toBeVisible();

    // Lista reflete o novo favorito: Ava tinha 2, agora 3.
    await page.goto("/favorites");
    await waitForMock(page);
    await expect(page.getByTestId("nft-card").first()).toBeVisible();
    await expect(page.getByTestId("nft-card")).toHaveCount(3);
  });

  test("falha na mutation faz rollback do estado otimista", async ({ page }) => {
    // `favorites-toggle-5xx`: só o POST /favorites falha (503); sessão e leitura seguem OK. Aplicado já
    // na navegação (via login) em vez de trocar de cenário no meio do teste — trocar em runtime
    // reinicia o store e invalida o token, deslogando o usuário e mascarando o rollback.
    await loginViaUI(page, "collector", {
      scenario: "favorites-toggle-5xx",
      seed: 1,
      redirect: `/nft/${NOT_FAVORITED_SLUG}`,
    });
    await expect(page.getByTestId("nft-detail")).toBeVisible();

    const favButton = page.getByRole("button", { name: "Favoritar" });
    await expect(favButton).toHaveAttribute("aria-pressed", "false");

    await favButton.click();

    // Efeito: o toggle otimista é revertido — o botão volta a "Favoritar"/aria-pressed=false e NÃO
    // permanece em "Remover dos favoritos".
    await expect(page.getByRole("button", { name: "Favoritar" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await expect(page.getByRole("button", { name: "Remover dos favoritos" })).toHaveCount(0);
  });
});
