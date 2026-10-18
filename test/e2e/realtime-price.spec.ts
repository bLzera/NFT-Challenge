import { expect, test, type Page } from "@playwright/test";
import { gotoWithScenario } from "./support/mock";
import { loginViaUI } from "./support/auth";

/**
 * Fluxo §9.9 — alteração de preço/disponibilidade "em tempo real" durante o checkout.
 * Desktop-only (lógica de bloqueio; checkout mobile idêntico, coberto por purchase.spec).
 *
 * LIMITAÇÃO DO HARNESS (ver relatório): o `socket.io-client` não completa o handshake com o
 * `@mswjs/socket.io-binding` no ambiente de execução, então o `nft.updated` NÃO é entregue ao vivo.
 * Os cenários, porém, agendam a mudança no STORE (price-changed: +25% após 4s no NFT do carrinho;
 * sold-out: editions→0 após 3s). O efeito real é observável ao refetchar (navegação/refresh): a
 * cotação nova diverge do snapshot do carrinho e o checkout BLOQUEIA a confirmação; no sold-out, a
 * criação do pedido é recusada por `conflict(availability)`. Verificamos esses efeitos reais.
 */
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop-only");
});

const SLUG = "neon-apes-2"; // nft-002: vira o firstCartNftId, alvo do nft.updated agendado.
const NFT_UPDATE_WAIT_MS = 5000; // > nftUpdateAfterMs (4000 price / 3000 sold-out).

/** Loga, adiciona nft-002 ao carrinho no cenário dado. */
async function loginAndAddToCart(page: Page, scenario: string) {
  await loginViaUI(page, "collector", { scenario, seed: 1, redirect: `/nft/${SLUG}` });
  await expect(page.getByTestId("nft-detail")).toBeVisible();
  await Promise.all([
    page.waitForResponse((r) => /\/cart\/items/.test(r.url()) && r.request().method() === "POST"),
    page.getByRole("button", { name: "Adicionar ao carrinho" }).click(),
  ]);
}

test.describe("tempo real — preço/disponibilidade", () => {
  // Gap conhecido tornado VISÍVEL no relatório (não escondido em comentário): a entrega AO VIVO de
  // `nft.updated` pelo `socket.io-client` (sem refetch/navegação) não é verificável porque o handshake
  // engine.io não completa com o `@mswjs/socket.io-binding` neste ambiente. Os testes abaixo cobrem o
  // EFEITO (cotação obsoleta bloqueia / esgotamento recusa) via refetch; este `fixme` marca o que
  // falta — a propagação pelo transporte real — para não dar a falsa impressão de que o socket ao vivo
  // foi exercitado. Reavaliar quando o binding suportar o handshake no headless.
  test.fixme(
    "preço muda e a UI reflete AO VIVO via socket.io-client (sem refetch) — bloqueado pelo handshake do binding MSW",
    async () => {},
  );

  test("mudança de preço torna a cotação obsoleta e bloqueia a confirmação até reconfirmar", async ({
    page,
  }) => {
    await loginAndAddToCart(page, "price-changed");

    // Aguarda a mudança agendada no store e entra no checkout (quote nova diverge do carrinho).
    await page.waitForTimeout(NFT_UPDATE_WAIT_MS);
    await gotoWithScenario(page, "/checkout", { scenario: "price-changed", seed: 1 });
    await expect(page.getByTestId("checkout")).toBeVisible();

    // Conecta a carteira (para isolar o bloqueio ao motivo "cotação desatualizada").
    await page.getByRole("button", { name: "Conectar carteira" }).click();
    await expect(page.getByText("Carteira conectada", { exact: true })).toBeVisible();

    // Efeito: aviso de preço mudado + confirmação BLOQUEADA até revisar/reconfirmar.
    await expect(page.getByText("O preço de um item mudou. Revise o resumo.")).toBeVisible();
    await expect(page.getByTestId("confirm-purchase")).toBeDisabled();
    // O caminho de revisão é oferecido (o usuário tem como reconfirmar).
    await expect(page.getByRole("button", { name: "Revisar e reconfirmar" })).toBeVisible();
    // A razão do bloqueio é anunciada de forma acessível.
    await expect(page.getByText(/cotação está desatualizada/i)).toBeVisible();
  });

  test("esgotamento durante a compra recusa a confirmação (conflict availability)", async ({
    page,
  }) => {
    await loginAndAddToCart(page, "sold-out-during-purchase");

    await gotoWithScenario(page, "/checkout", { scenario: "sold-out-during-purchase", seed: 1 });
    await expect(page.getByTestId("checkout")).toBeVisible();

    await page.getByRole("button", { name: "Conectar carteira" }).click();
    await expect(page.getByText("Carteira conectada", { exact: true })).toBeVisible();

    // Aguarda o esgotamento agendado no store e tenta confirmar.
    await page.waitForTimeout(NFT_UPDATE_WAIT_MS);
    await page.getByTestId("confirm-purchase").click();

    // Efeito: criação recusada por disponibilidade — feedback e permanência no checkout (sem pedido).
    await expect(page.getByText(/Edição esgotada durante a compra/i)).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/checkout/);
  });
});
