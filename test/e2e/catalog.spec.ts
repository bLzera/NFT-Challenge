import { expect, test } from "@playwright/test";
import { gotoWithScenario } from "./support/mock";

/**
 * Fluxo §9.1 — busca, filtros combinados, ordenação, paginação e restauração pelo histórico.
 * O estado da consulta vive no `search` da URL (useCatalogSearch), então back/forward/refresh devem
 * restaurá-lo. Roda em desktop E mobile (fluxo principal). No mobile os filtros vivem num Dialog.
 */

test.describe("catálogo", () => {
  test("busca por título restringe a grade e grava na URL", async ({ page }) => {
    await gotoWithScenario(page, "/", { scenario: "default", seed: 1 });

    await expect(page.getByTestId("nft-card").first()).toBeVisible();

    // A busca vive no ícone do header (fiel ao Figma): abre o diálogo, busca e navega com ?q=.
    await page.getByRole("button", { name: "Buscar NFTs" }).click();
    const search = page.getByPlaceholder("Buscar por título, coleção ou criador");
    await search.fill("Neon Apes");
    await page.getByRole("button", { name: "Buscar" }).click();

    // URL reflete a busca (fonte única do estado).
    await expect(page).toHaveURL(/q=Neon\+Apes|q=Neon%20Apes/);

    // Resultado: só cards da coleção buscada (asserção de efeito, não só presença).
    const cards = page.getByTestId("nft-card");
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i)).toHaveAttribute("aria-label", /Neon Apes/);
    }
  });

  test("busca sem resultados mostra estado vazio", async ({ page }) => {
    await gotoWithScenario(page, "/", { scenario: "default", seed: 1 });
    await expect(page.getByTestId("nft-card").first()).toBeVisible();

    await page.getByRole("button", { name: "Buscar NFTs" }).click();
    const search = page.getByPlaceholder("Buscar por título, coleção ou criador");
    await search.fill("zzz-nao-existe-zzz");
    await page.getByRole("button", { name: "Buscar" }).click();

    await expect(page.getByText("Nenhum NFT encontrado")).toBeVisible();
    await expect(page.getByTestId("nft-card")).toHaveCount(0);
  });

  test("ordenação por preço reordena a grade e persiste na URL", async ({ page }) => {
    await gotoWithScenario(page, "/", { scenario: "default", seed: 1 });
    await expect(page.getByTestId("nft-card").first()).toBeVisible();

    // Dropdown de ordenação (aria-label da toolbar já identifica a nav de categorias).
    await page.getByRole("button", { name: /Ordenar por:/ }).click();
    await page.getByRole("menuitem", { name: "Preço: menor para maior" }).click();

    await expect(page).toHaveURL(/sort=price_asc/);
    await expect(page.getByTestId("nft-card").first()).toBeVisible();

    // Efeito: preços em ordem crescente. O aria-label do card tem "..., <preço> ETH".
    // Usa expect.poll para aguardar a grade reordenada estabilizar após o refetch.
    await expect
      .poll(async () => {
        const labels = await page
          .getByTestId("nft-card")
          .evaluateAll((els) => els.map((el) => el.getAttribute("aria-label") ?? ""));
        const prices = labels.map((l) => {
          const m = l.match(/([0-9]+\.?[0-9]*)\s*ETH/);
          return m ? Number(m[1]) : NaN;
        });
        if (prices.length < 2 || prices.some((p) => Number.isNaN(p))) return false;
        return prices.every((p, i) => i === 0 || p >= prices[i - 1]);
      })
      .toBe(true);
  });

  test("paginação avança de página e o botão anterior volta", async ({ page }) => {
    await gotoWithScenario(page, "/", { scenario: "default", seed: 1 });
    await expect(page.getByTestId("nft-card").first()).toBeVisible();

    const firstPageFirstLabel = await page
      .getByTestId("nft-card")
      .first()
      .getAttribute("aria-label");

    const pager = page.getByRole("navigation", { name: "Paginação" });
    await pager.getByRole("button", { name: "Próxima página" }).click();

    await expect(page).toHaveURL(/page=2/);
    // Página 2 ativa (aria-current="page").
    await expect(pager.getByRole("button", { name: "2" })).toHaveAttribute("aria-current", "page");

    // Efeito: o primeiro card da página 2 difere do da página 1.
    const page2FirstLabel = await page.getByTestId("nft-card").first().getAttribute("aria-label");
    expect(page2FirstLabel).not.toBe(firstPageFirstLabel);

    await pager.getByRole("button", { name: "Página anterior" }).click();
    await expect(page).toHaveURL(/page=1/);
    await expect(page.getByTestId("nft-card").first()).toHaveAttribute(
      "aria-label",
      firstPageFirstLabel!,
    );
  });

  test("estado na URL sobrevive a back/forward e a refresh", async ({ page }) => {
    await gotoWithScenario(page, "/", { scenario: "default", seed: 1 });
    await expect(page.getByTestId("nft-card").first()).toBeVisible();

    // Aplica busca (via diálogo do header).
    await page.getByRole("button", { name: "Buscar NFTs" }).click();
    const search = page.getByPlaceholder("Buscar por título, coleção ou criador");
    await search.fill("Pixel Spirits");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page).toHaveURL(/q=Pixel/);
    await expect(page.getByTestId("nft-card").first()).toHaveAttribute("aria-label", /Pixel Spirits/);

    // Volta no histórico → estado inicial (sem q).
    await page.goBack();
    await expect(page).not.toHaveURL(/q=Pixel/);

    // Avança → estado buscado restaurado.
    await page.goForward();
    await expect(page).toHaveURL(/q=Pixel/);
    await expect(page.getByTestId("nft-card").first()).toHaveAttribute("aria-label", /Pixel Spirits/);

    // Refresh (deep-link): estado reconstruído da URL.
    await page.reload();
    await expect(page).toHaveURL(/q=Pixel/);
    await expect(page.getByTestId("nft-card").first()).toHaveAttribute("aria-label", /Pixel Spirits/);
    // A busca do header reflete o `q` da URL ao reabrir (sincronização URL → rascunho).
    await page.getByRole("button", { name: "Buscar NFTs" }).click();
    await expect(page.getByPlaceholder("Buscar por título, coleção ou criador")).toHaveValue(
      "Pixel Spirits",
    );
  });
});
