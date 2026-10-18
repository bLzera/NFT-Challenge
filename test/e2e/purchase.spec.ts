import { expect, test, type Page } from "@playwright/test";
import { gotoWithScenario } from "./support/mock";
import { loginViaUI } from "./support/auth";

/**
 * Fluxo §9.6 — compra completa: catálogo → detalhe → carrinho → checkout → recibo confirmado.
 * Cenário `payment-confirmed` (order.updated: confirmed ~1.2s). collector tem carteiras semeadas.
 * Fluxo principal: desktop E mobile.
 *
 * NOTA (limitação do harness): no ambiente de execução o `socket.io-client` NÃO completa o handshake
 * com o `@mswjs/socket.io-binding` (um WebSocket cru abre via MSW, mas o engine.io do socket.io dá
 * timeout) — ver relatório. Em consequência, a transição `pending → confirmed` por evento de socket
 * ao vivo não chega à tela de pedido. O store, porém, RESOLVE o pedido no prazo do cenário e
 * `getOrder` passa a devolver o estado terminal. Portanto, para observar o recibo confirmado
 * (resultado real, não fabricado), recarregamos a página do pedido após o prazo de resolução — que é
 * exatamente o caminho de retomada pós-refresh (§9.10). O pedido NÃO é recriado nesse refresh.
 */

const SLUG = "neon-apes-2"; // nft-002, com estoque.
const RESOLUTION_WAIT_MS = 2500; // > delayMs (1200) do cenário payment-confirmed.

/** Conecta a carteira, confirma a compra e vai para /order/$id. */
async function connectConfirm(page: Page) {
  await expect(page.getByTestId("checkout")).toBeVisible();

  const connect = page.getByRole("button", { name: "Conectar carteira" });
  await expect(connect).toBeEnabled();
  await connect.click();
  await expect(page.getByText("Carteira conectada", { exact: true })).toBeVisible();

  const confirm = page.getByTestId("confirm-purchase");
  await expect(confirm).toBeEnabled();
  await confirm.click();

  await expect(page).toHaveURL(/\/order\//);
  // Enquanto o socket não entrega o evento, a tela fica "Confirmando o pagamento…" (pending).
  await expect(page.getByText("Confirmando o pagamento…")).toBeVisible();
}

/** Recarrega a página do pedido após o prazo de resolução → getOrder devolve o estado terminal. */
async function reloadUntilConfirmed(page: Page, scenario: string) {
  const path = new URL(page.url()).pathname;
  await page.waitForTimeout(RESOLUTION_WAIT_MS);
  await gotoWithScenario(page, path, { scenario, seed: 1 });
  await expect(
    page.getByRole("heading", { name: "Seus NFTs agora estão na sua carteira" }),
  ).toBeVisible({ timeout: 15_000 });
}

test.describe("compra", () => {
  test("do catálogo ao recibo confirmado", async ({ page }) => {
    // Começa no catálogo (fluxo completo), logado com redirect ao detalhe.
    await gotoWithScenario(page, "/", { scenario: "payment-confirmed", seed: 1 });
    await expect(page.getByTestId("nft-card").first()).toBeVisible();

    // Loga e cai no detalhe do NFT alvo.
    await loginViaUI(page, "collector", {
      scenario: "payment-confirmed",
      seed: 1,
      redirect: `/nft/${SLUG}`,
    });
    await expect(page.getByTestId("nft-detail")).toBeVisible();

    // Adiciona ao carrinho.
    await Promise.all([
      page.waitForResponse((r) => /\/cart\/items/.test(r.url()) && r.request().method() === "POST"),
      page.getByRole("button", { name: "Adicionar ao carrinho" }).click(),
    ]);

    // Vai ao carrinho e segue para o checkout.
    await gotoWithScenario(page, "/cart", { scenario: "payment-confirmed", seed: 1 });
    await expect(page.getByTestId("cart-item-nft-002")).toBeVisible();
    await page.getByTestId("checkout-cta").click();
    await expect(page).toHaveURL(/\/checkout/);

    // Conecta e confirma (cria o pedido no servidor).
    await connectConfirm(page);

    // Observa o resultado real: recibo confirmado (estado terminal do pedido resolvido pelo servidor).
    await reloadUntilConfirmed(page, "payment-confirmed");
    // Metadados do recibo (termos da lista de definição).
    await expect(page.getByRole("term").filter({ hasText: "ID da transação" })).toBeVisible();
    await expect(page.getByRole("term").filter({ hasText: "Data" })).toBeVisible();
    // Item do pedido presente no recibo (efeito concreto, não só um elemento qualquer).
    await expect(
      page.getByRole("list", { name: "Itens do pedido" }).getByText("Neon Apes #2"),
    ).toBeVisible();
  });

  test("recibo confirmado é estável a refresh (mesmo pedido, não recria)", async ({ page }) => {
    await loginViaUI(page, "collector", {
      scenario: "payment-confirmed",
      seed: 1,
      redirect: `/nft/${SLUG}`,
    });
    await expect(page.getByTestId("nft-detail")).toBeVisible();
    await Promise.all([
      page.waitForResponse((r) => /\/cart\/items/.test(r.url()) && r.request().method() === "POST"),
      page.getByRole("button", { name: "Adicionar ao carrinho" }).click(),
    ]);
    await gotoWithScenario(page, "/cart", { scenario: "payment-confirmed", seed: 1 });
    await page.getByTestId("checkout-cta").click();
    await connectConfirm(page);

    const orderPath = new URL(page.url()).pathname;
    await reloadUntilConfirmed(page, "payment-confirmed");

    // Um novo refresh na mesma rota do pedido mantém o MESMO pedido confirmado (idempotente).
    await gotoWithScenario(page, orderPath, { scenario: "payment-confirmed", seed: 1 });
    await expect(
      page.getByRole("heading", { name: "Seus NFTs agora estão na sua carteira" }),
    ).toBeVisible({ timeout: 15_000 });
    // A URL do pedido não mudou (nenhum pedido novo foi criado).
    expect(new URL(page.url()).pathname).toBe(orderPath);
  });
});
