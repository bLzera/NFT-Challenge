import { expect, test, type Page } from "@playwright/test";
import { gotoWithScenario } from "./support/mock";
import { loginViaUI } from "./support/auth";

/**
 * Fluxo §9.5 — carrinho: adicionar, quantidade, remover, cupom inválido, persistência após
 * refresh/login (merge do carrinho de visitante). Fluxo principal: desktop E mobile.
 *
 * IMPORTANTE: a persistência do mock é particionada por cenário+seed (localStorage por `scenario:seed`).
 * Toda navegação full-reload DEVE carregar `?scenario=&seed=` (via gotoWithScenario), senão o store
 * cai noutra partição e o carrinho "some". Usamos sempre a mesma partição por teste.
 *
 * nft-002 (neon-apes-2) e nft-003 (neon-apes-3) têm estoque; evitamos nft-001 (alvo realtime).
 */

const SLUG_A = "neon-apes-2";
const SLUG_B = "neon-apes-3";

/** Adiciona o NFT atual (já logado, no detalhe) ao carrinho via "Adicionar ao carrinho". */
async function addCurrentToCart(page: Page) {
  await expect(page.getByTestId("nft-detail")).toBeVisible();
  await Promise.all([
    page.waitForResponse((r) => /\/cart\/items/.test(r.url()) && r.request().method() === "POST"),
    page.getByRole("button", { name: "Adicionar ao carrinho" }).click(),
  ]);
}

test.describe("carrinho", () => {
  test("adicionar item reflete no carrinho e no badge do header", async ({ page }) => {
    await loginViaUI(page, "collector", { scenario: "default", seed: 1, redirect: `/nft/${SLUG_A}` });
    await addCurrentToCart(page);

    await gotoWithScenario(page, "/cart", { scenario: "default", seed: 1 });

    await expect(page.getByTestId("cart")).toBeVisible();
    await expect(page.getByTestId("cart-item-nft-002")).toBeVisible();
    await expect(page.getByRole("link", { name: /Carrinho, 1 itens/ })).toBeVisible();
  });

  test("mudar quantidade atualiza o total da linha e o badge", async ({ page }) => {
    await loginViaUI(page, "collector", { scenario: "default", seed: 1, redirect: `/nft/${SLUG_A}` });
    await addCurrentToCart(page);
    await gotoWithScenario(page, "/cart", { scenario: "default", seed: 1 });

    const item = page.getByTestId("cart-item-nft-002");
    await expect(item).toBeVisible();

    await Promise.all([
      page.waitForResponse(
        (r) => /\/cart\/items/.test(r.url()) && r.request().method() === "PATCH",
      ),
      item.getByRole("button", { name: "Aumentar quantidade" }).click(),
    ]);

    await expect(item.getByRole("group", { name: "Quantidade" })).toContainText("2");
    await expect(page.getByRole("link", { name: /Carrinho, 2 itens/ })).toBeVisible();
  });

  test("remover item esvazia o carrinho", async ({ page }) => {
    await loginViaUI(page, "collector", { scenario: "default", seed: 1, redirect: `/nft/${SLUG_A}` });
    await addCurrentToCart(page);
    await gotoWithScenario(page, "/cart", { scenario: "default", seed: 1 });

    const item = page.getByTestId("cart-item-nft-002");
    await expect(item).toBeVisible();

    await Promise.all([
      page.waitForResponse((r) => /\/cart\/items/.test(r.url()) && r.request().method() === "DELETE"),
      item.getByRole("button", { name: /Remover .* do carrinho/ }).click(),
    ]);

    await expect(page.getByText("Seu carrinho está vazio.")).toBeVisible();
    await expect(page.getByTestId("cart-item-nft-002")).toHaveCount(0);
  });

  test("cupom inválido (NOPE) mostra mensagem inline", async ({ page }) => {
    await loginViaUI(page, "collector", {
      scenario: "coupon-invalid",
      seed: 1,
      redirect: `/nft/${SLUG_A}`,
    });
    await addCurrentToCart(page);
    await gotoWithScenario(page, "/cart", { scenario: "coupon-invalid", seed: 1 });
    await expect(page.getByTestId("cart")).toBeVisible();

    await page.getByLabel("Código promocional").fill("NOPE");
    await page.getByRole("button", { name: "Aplicar" }).click();

    await expect(page.getByText("Cupom inválido.")).toBeVisible();
  });

  test("carrinho persiste após refresh (logado)", async ({ page }) => {
    await loginViaUI(page, "collector", { scenario: "default", seed: 1, redirect: `/nft/${SLUG_A}` });
    await addCurrentToCart(page);
    await gotoWithScenario(page, "/cart", { scenario: "default", seed: 1 });
    await expect(page.getByTestId("cart-item-nft-002")).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("cart-item-nft-002")).toBeVisible();
  });

  test("carrinho do usuário sobrevive a logout + novo login (persistência por conta)", async ({
    page,
  }) => {
    // Nota: o mock particiona o carrinho por dono (`guest` vs userId). A UI do detalhe só permite
    // adicionar logado (visitante vê link de login), então o "merge do guest" não é alcançável só por
    // clique de UI. O que o usuário realmente observa é: o carrinho da conta persiste e reaparece ao
    // reautenticar — é isso que asseguramos aqui (persistência por conta, §9.5).
    await loginViaUI(page, "collector", { scenario: "default", seed: 1, redirect: `/nft/${SLUG_B}` });
    await addCurrentToCart(page);
    await gotoWithScenario(page, "/cart", { scenario: "default", seed: 1 });
    await expect(page.getByTestId("cart-item-nft-003")).toBeVisible();

    // Encerra a sessão limpando o token (o menu de conta varia entre desktop/mobile; o logout em si
    // é coberto por auth.spec.ts). Aqui o foco é a persistência do carrinho por conta ao reautenticar.
    await page.evaluate(() => localStorage.removeItem("nft-auth:v1:token"));

    await gotoWithScenario(page, `/login?redirect=${encodeURIComponent("/cart")}`, {
      scenario: "default",
      seed: 1,
    });
    await page.getByLabel("E-mail").fill("collector@example.com");
    await page.getByLabel("Senha", { exact: true }).fill("password123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/cart/);
    await expect(page.getByTestId("cart-item-nft-003")).toBeVisible();
  });
});
