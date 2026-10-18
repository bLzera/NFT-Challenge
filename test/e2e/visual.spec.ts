import { expect, test, type Page } from "@playwright/test";
import { gotoWithScenario } from "./support/mock";
import { loginViaUI } from "./support/auth";

/**
 * Regressão visual (Fase 5, ver e2e.spec.md § Regressão visual): snapshots de início (`/`), detalhe
 * (`/nft/<slug>`), carrinho (`/cart` com item) e pagamento (`/checkout`).
 *
 * Determinismo:
 *  - `scenario=default&seed=1` em toda navegação full-reload (partição estável do store).
 *  - Animações desligadas (`animations: "disabled"` + `prefers-reduced-motion`).
 *  - As artes de NFT e avatares vêm de `picsum.photos` (externo, não-determinístico) → **mascaradas**
 *    (`mask: [img]`). Ícones/logos são SVG inline (determinísticos) e permanecem visíveis.
 *  - Fontes (`Roboto Mono`) aguardadas antes do snapshot p/ evitar diff por FOUT.
 *
 * Baselines versionadas em `test/e2e/visual.spec.ts-snapshots/` (padrão do Playwright, tag `-linux`
 * no nome); `npm run test:e2e:update` regenera.
 * Rodam em desktop (1440×900) e mobile (390×844), cobrindo o eixo responsivo do README §8.
 */

const SLUG = "neon-apes-2"; // nft-002, com estoque e não-alvo de realtime.

const SNAPSHOT_OPTS = {
  fullPage: true,
  animations: "disabled",
  maxDiffPixelRatio: 0.01,
} as const;

/** Aguarda fontes carregadas e força reduced-motion antes de capturar. */
async function stabilize(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

/** Mask das imagens externas (artes/avatares). Recalculado por página. */
function maskImages(page: Page) {
  return { ...SNAPSHOT_OPTS, mask: [page.locator("img")] };
}

/** Loga, adiciona o NFT alvo ao carrinho e deixa a sessão pronta na partição default:1. */
async function loginAndAddToCart(page: Page) {
  await loginViaUI(page, "collector", { scenario: "default", seed: 1, redirect: `/nft/${SLUG}` });
  await expect(page.getByTestId("nft-detail")).toBeVisible();
  await Promise.all([
    page.waitForResponse((r) => /\/cart\/items/.test(r.url()) && r.request().method() === "POST"),
    page.getByRole("button", { name: "Adicionar ao carrinho" }).click(),
  ]);
}

test.describe("regressão visual", () => {
  test("início (catálogo)", async ({ page }) => {
    await gotoWithScenario(page, "/", { scenario: "default", seed: 1 });
    await expect(page.getByTestId("nft-card").first()).toBeVisible();
    await stabilize(page);
    await expect(page).toHaveScreenshot("home.png", maskImages(page));
  });

  test("detalhe do NFT", async ({ page }) => {
    await gotoWithScenario(page, `/nft/${SLUG}`, { scenario: "default", seed: 1 });
    await expect(page.getByTestId("nft-detail")).toBeVisible();
    await stabilize(page);
    await expect(page).toHaveScreenshot("nft-detail.png", maskImages(page));
  });

  test("carrinho com item", async ({ page }) => {
    await loginAndAddToCart(page);
    await gotoWithScenario(page, "/cart", { scenario: "default", seed: 1 });
    await expect(page.getByTestId("cart-item-nft-002")).toBeVisible();
    await stabilize(page);
    await expect(page).toHaveScreenshot("cart.png", maskImages(page));
  });

  test("pagamento (checkout)", async ({ page }) => {
    await loginAndAddToCart(page);
    await gotoWithScenario(page, "/cart", { scenario: "default", seed: 1 });
    await expect(page.getByTestId("cart-item-nft-002")).toBeVisible();
    await page.getByTestId("checkout-cta").click();
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByTestId("checkout")).toBeVisible();
    await stabilize(page);
    await expect(page).toHaveScreenshot("checkout.png", maskImages(page));
  });
});
