import { expect, test } from "@playwright/test";
import { gotoWithScenario } from "./support/mock";

/**
 * Fluxo §9.11 — navegação por teclado, foco de diálogos e validação acessível de formulários.
 * Roda em desktop e mobile (a acessibilidade importa nos dois viewports).
 */

test.describe("acessibilidade", () => {
  test("AuthDialog: é um diálogo modal com foco preso e fecha no Esc", async ({ page }) => {
    await gotoWithScenario(page, "/login", { scenario: "default", seed: 1 });

    // Diálogo acessível com nome acessível (título "Entrar"), foco gerenciado pelo Radix.
    const dialog = page.getByRole("dialog", { name: /Entrar/ });
    await expect(dialog).toBeVisible();

    // Foco inicial dentro do diálogo; Tab mantém o foco dentro (foco preso).
    await page.keyboard.press("Tab");
    const focusInside = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      return d?.contains(document.activeElement) ?? false;
    });
    expect(focusInside).toBe(true);

    // Esc fecha o diálogo (navega para o destino de retorno).
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("login vazio mostra erros de validação acessíveis", async ({ page }) => {
    await gotoWithScenario(page, "/login", { scenario: "default", seed: 1 });

    // Submete o formulário vazio.
    await page.getByRole("button", { name: "Entrar" }).click();

    // Erros acessíveis: role=alert e campos marcados aria-invalid.
    await expect(page.getByRole("alert").first()).toBeVisible();
    await expect(page.getByLabel("E-mail")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Senha", { exact: true })).toHaveAttribute("aria-invalid", "true");
  });

  test("busca do catálogo é operável por teclado (Enter commita)", async ({ page }) => {
    await gotoWithScenario(page, "/", { scenario: "default", seed: 1 });
    await expect(page.getByTestId("nft-card").first()).toBeVisible();

    const search = page.getByPlaceholder("Buscar por título, coleção ou criador");
    await search.click();
    await page.keyboard.type("Astral Glyphs");
    await page.keyboard.press("Enter");

    // Efeito: a busca commitou pela URL e a grade filtrou — tudo por teclado.
    await expect(page).toHaveURL(/q=Astral/);
    await expect(page.getByTestId("nft-card").first()).toHaveAttribute("aria-label", /Astral Glyphs/);
  });

  test("paginação expõe a página atual com aria-current", async ({ page }) => {
    await gotoWithScenario(page, "/", { scenario: "default", seed: 1 });
    await expect(page.getByTestId("nft-card").first()).toBeVisible();

    const pager = page.getByRole("navigation", { name: "Paginação" });
    await expect(pager.getByRole("button", { name: "1" })).toHaveAttribute("aria-current", "page");
    // Botão "anterior" desabilitado na primeira página (estado real, não só visual).
    await expect(pager.getByRole("button", { name: "Página anterior" })).toBeDisabled();
  });
});
