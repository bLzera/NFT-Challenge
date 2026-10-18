import { expect, test } from "@playwright/test";
import { gotoWithScenario } from "./support/mock";

/**
 * Fluxo §9.2 — acesso direto (deep-link) ao detalhe e recurso inexistente (not_found).
 * Slug conhecido e estável vindo das fixtures (nft-001 → "neon-apes-1"). Fluxo principal: desktop E
 * mobile. No mobile o detalhe usa a Buy Bar fixa; no desktop, o painel lateral.
 */

const KNOWN_SLUG = "neon-apes-1";

test.describe("detalhe do NFT", () => {
  test("deep-link por slug carrega o detalhe com título e preço", async ({ page }) => {
    await gotoWithScenario(page, `/nft/${KNOWN_SLUG}`, { scenario: "default", seed: 1 });

    const detail = page.getByTestId("nft-detail");
    await expect(detail).toBeVisible();

    // Efeito: dados reais do NFT renderizados (título e preço do fixture nft-001).
    await expect(detail.getByRole("heading", { name: "Neon Apes #1" })).toBeVisible();
    await expect(detail.getByText(/ETH/).first()).toBeVisible();
    await expect(detail.getByText("Coleção: Neon Apes")).toBeVisible();
    await expect(detail.getByText("ID do token: #nft-001")).toBeVisible();
  });

  test("visitante vê CTA de compra que leva ao login preservando o destino", async ({ page }) => {
    await gotoWithScenario(page, `/nft/${KNOWN_SLUG}`, { scenario: "default", seed: 1 });
    await expect(page.getByTestId("nft-detail")).toBeVisible();

    // Sem sessão, "Comprar NFT" é um link para /login com redirect ao detalhe.
    const buyLink = page.getByRole("link", { name: "Comprar NFT" });
    await expect(buyLink.first()).toBeVisible();
    await buyLink.first().click();
    await expect(page).toHaveURL(/\/login\?redirect=/);
    await expect(page).toHaveURL(new RegExp(encodeURIComponent(`/nft/${KNOWN_SLUG}`)));
  });

  test("slug inexistente mostra estado 'NFT não encontrado'", async ({ page }) => {
    // Recurso de fato ausente (§9.2): sob o cenário saudável `default`, o handler `nfts.get` retorna
    // not_found SÓ para este slug (store.getNft → null → errors.notFound) — exercita o caminho real de
    // "este NFT não existe", não uma falha global de servidor.
    await gotoWithScenario(page, "/nft/este-nft-nao-existe", { scenario: "default", seed: 1 });

    await expect(page.getByText("NFT não encontrado")).toBeVisible();
    await expect(page.getByRole("link", { name: "Voltar ao catálogo" })).toBeVisible();
    // Não renderiza o corpo do detalhe.
    await expect(page.getByTestId("nft-detail")).toHaveCount(0);
  });

  test("volta ao catálogo recupera a grade", async ({ page }) => {
    await gotoWithScenario(page, "/nft/este-nft-nao-existe", { scenario: "default", seed: 1 });
    await expect(page.getByText("NFT não encontrado")).toBeVisible();

    // Navega ao catálogo pelo CTA (mesmo cenário saudável).
    await page.getByRole("link", { name: "Voltar ao catálogo" }).click();
    await expect(page).toHaveURL(/\/($|\?)/);
    await expect(page.getByTestId("nft-card").first()).toBeVisible();
  });
});
