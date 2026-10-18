import { expect, test, type Page } from "@playwright/test";
import { gotoWithScenario } from "./support/mock";
import { loginViaUI } from "./support/auth";

/**
 * Fluxo §9.7 — pagamento recusado; clique repetido não duplica pedido; timeout com recuperação do
 * MESMO pedido (idempotência). Desktop-only (checkout tem o mesmo comportamento no mobile, coberto
 * por purchase.spec; aqui focamos a lógica de erro/idempotência).
 *
 * LIMITAÇÃO DO HARNESS (ver relatório/purchase.spec): o socket.io não entrega os eventos ao vivo, então
 * a transição terminal (declined/confirmed) é observada recarregando a página do pedido após o prazo
 * de resolução do cenário — `getOrder` devolve o estado terminal real do store (não fabricado).
 */
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop-only");
});

const SLUG = "neon-apes-2";
const RESOLUTION_WAIT_MS = 2500; // > delayMs (1200).

/** Loga, adiciona nft-002 e vai ao checkout no cenário dado. */
async function reachCheckout(page: Page, scenario: string) {
  await loginViaUI(page, "collector", { scenario, seed: 1, redirect: `/nft/${SLUG}` });
  await expect(page.getByTestId("nft-detail")).toBeVisible();
  await Promise.all([
    page.waitForResponse((r) => /\/cart\/items/.test(r.url()) && r.request().method() === "POST"),
    page.getByRole("button", { name: "Adicionar ao carrinho" }).click(),
  ]);
  await gotoWithScenario(page, "/cart", { scenario, seed: 1 });
  await page.getByTestId("checkout-cta").click();
  await expect(page.getByTestId("checkout")).toBeVisible();

  // Conecta a carteira.
  await page.getByRole("button", { name: "Conectar carteira" }).click();
  await expect(page.getByText("Carteira conectada", { exact: true })).toBeVisible();
}

async function reloadOrder(page: Page, scenario: string) {
  const path = new URL(page.url()).pathname;
  await page.waitForTimeout(RESOLUTION_WAIT_MS);
  await gotoWithScenario(page, path, { scenario, seed: 1 });
}

test.describe("falha de pagamento", () => {
  test("pagamento recusado mostra a tela de recusa", async ({ page }) => {
    await reachCheckout(page, "payment-declined");

    await page.getByTestId("confirm-purchase").click();
    await expect(page).toHaveURL(/\/order\//);
    await expect(page.getByText("Confirmando o pagamento…")).toBeVisible();

    // Estado terminal: recusado (resultado real do store).
    await reloadOrder(page, "payment-declined");
    await expect(page.getByRole("heading", { name: "Pagamento recusado" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("link", { name: "Tentar novamente" })).toBeVisible();
  });

  test("timeout no 1º POST recupera o MESMO pedido no retry (sem duplicar)", async ({ page }) => {
    await reachCheckout(page, "order-timeout");

    // 1ª confirmação: timeout (NetworkError) → toast de reconexão; permanece no checkout.
    await page.getByTestId("confirm-purchase").click();
    await expect(
      page.getByText("Não recebemos confirmação. Tente novamente — vamos reconectar ao mesmo pedido."),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/checkout/);

    // 2ª confirmação (mesma idempotencyKey): recupera o pedido existente e navega para /order/$id.
    const confirm = page.getByTestId("confirm-purchase");
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(page).toHaveURL(/\/order\//);
    const orderPath = new URL(page.url()).pathname;

    // O pedido recuperado resolve para confirmado (order-timeout usa resolução confirmed).
    await reloadOrder(page, "order-timeout");
    await expect(
      page.getByRole("heading", { name: "Seus NFTs agora estão na sua carteira" }),
    ).toBeVisible({ timeout: 15_000 });

    // Não duplicou: só existe um pedido para esta conta (order-0001). A URL é a desse único pedido.
    expect(orderPath).toMatch(/\/order\/order-0001$/);
  });

  test("clique repetido durante a criação não dispara segundo pedido", async ({ page }) => {
    await reachCheckout(page, "payment-declined");

    const confirm = page.getByTestId("confirm-purchase");
    // Dispara a confirmação; o botão fica desabilitado/aria-busy durante a criação (guarda contra
    // duplo-submit). Um 2º clique forçado imediato não cria outro pedido.
    await confirm.click();
    await confirm.click({ force: true, timeout: 1000 }).catch(() => {});

    await expect(page).toHaveURL(/\/order\//);
    // Resultado: um único pedido para a conta (order-0001) — clique repetido não duplicou.
    expect(new URL(page.url()).pathname).toMatch(/\/order\/order-0001$/);
  });
});
