import { expect, test, type Page } from "@playwright/test";
import { gotoWithScenario } from "./support/mock";
import { loginViaUI } from "./support/auth";

/**
 * Fluxo §9.10 — retomada de pedido pendente após refresh: com um pedido pendente, um refresh NÃO cria
 * outro pedido e o estado é recuperado. Desktop-only (lógica de recuperação; sem divergência mobile
 * relevante — o fluxo de compra em si é coberto em ambos por purchase.spec).
 *
 * LIMITAÇÃO DO HARNESS (ver relatório): o socket não entrega eventos ao vivo; a transição terminal é
 * observada por refetch após o prazo de resolução do cenário. Isso é justamente o cenário desta suíte
 * (retomada por refresh). O store mantém UM único pedido por tentativa (idempotência), então refreshes
 * sucessivos recuperam o MESMO pedido — sem duplicar.
 *
 * COBERTURA DE "eventos duplicados/antigos" (§9.10): a tolerância a eventos repetidos e a descarte por
 * `version` menor/igual é lógica pura do cliente, coberta por unidade em
 * `src/lib/realtime/apply-events.test.ts` (aplica idempotente e ignora versões obsoletas). Não é
 * reexercitada aqui porque, sem entrega ao vivo via socket neste harness, um E2E não acrescentaria
 * sinal sobre o teste unitário. Ver também o `test.fixme` em `realtime-price.spec.ts`.
 */
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop-only");
});

const SLUG = "neon-apes-2";
const RESOLUTION_WAIT_MS = 2500;

/** Loga, adiciona nft-002, vai ao checkout, conecta e confirma → navega para /order/$id (pendente). */
async function createPendingOrder(page: Page, scenario: string): Promise<string> {
  await loginViaUI(page, "collector", { scenario, seed: 1, redirect: `/nft/${SLUG}` });
  await expect(page.getByTestId("nft-detail")).toBeVisible();
  await Promise.all([
    page.waitForResponse((r) => /\/cart\/items/.test(r.url()) && r.request().method() === "POST"),
    page.getByRole("button", { name: "Adicionar ao carrinho" }).click(),
  ]);
  await gotoWithScenario(page, "/cart", { scenario, seed: 1 });
  await page.getByTestId("checkout-cta").click();
  await expect(page.getByTestId("checkout")).toBeVisible();
  await page.getByRole("button", { name: "Conectar carteira" }).click();
  await expect(page.getByText("Carteira conectada", { exact: true })).toBeVisible();
  await page.getByTestId("confirm-purchase").click();
  await expect(page).toHaveURL(/\/order\//);
  return new URL(page.url()).pathname;
}

test.describe("tempo real — retomada", () => {
  test("refresh em pedido pendente recupera o MESMO pedido (não duplica) e resolve", async ({
    page,
  }) => {
    const orderPath = await createPendingOrder(page, "payment-confirmed");
    // Estado inicial observável: pendente (aguardando confirmação).
    await expect(page.getByText("Confirmando o pagamento…")).toBeVisible();

    // Deixa o store resolver o pedido (o timer de resolução roda no contexto original) e então
    // recarrega a MESMA rota do pedido: o estado terminal confirmado é recuperado, sem recriar pedido.
    await page.waitForTimeout(RESOLUTION_WAIT_MS);
    await gotoWithScenario(page, orderPath, { scenario: "payment-confirmed", seed: 1 });
    await expect(
      page.getByRole("heading", { name: "Seus NFTs agora estão na sua carteira" }),
    ).toBeVisible({ timeout: 15_000 });
    expect(new URL(page.url()).pathname).toBe(orderPath);

    // Mais um refresh: continua o MESMO pedido confirmado (idempotente, nada duplicado).
    await gotoWithScenario(page, orderPath, { scenario: "payment-confirmed", seed: 1 });
    await expect(
      page.getByRole("heading", { name: "Seus NFTs agora estão na sua carteira" }),
    ).toBeVisible({ timeout: 15_000 });
    expect(new URL(page.url()).pathname).toBe(orderPath);
  });

  test("voltar ao checkout com pedido pendente reconcilia sem criar novo pedido", async ({
    page,
  }) => {
    const orderPath = await createPendingOrder(page, "payment-confirmed");
    await expect(page.getByText("Confirmando o pagamento…")).toBeVisible();

    // Aguarda a resolução e volta ao /checkout: a tela reconcilia o pedido pendente salvo e redireciona
    // para o MESMO /order/$id (não inicia uma nova compra nem cria outro pedido).
    await page.waitForTimeout(RESOLUTION_WAIT_MS);
    await gotoWithScenario(page, "/checkout", { scenario: "payment-confirmed", seed: 1 });
    await expect(page).toHaveURL(new RegExp(orderPath.replace(/\//g, "\\/")), { timeout: 15_000 });
    expect(new URL(page.url()).pathname).toBe(orderPath);
  });
});
