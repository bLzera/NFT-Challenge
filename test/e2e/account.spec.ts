import { expect, test } from "@playwright/test";
import { gotoWithScenario } from "./support/mock";
import { loginViaUI } from "./support/auth";

/**
 * Fluxo §9.8 — edição de perfil, avatar, senha, carteiras, com erros de validação. Desktop-only
 * (formulários idênticos no mobile; não é fluxo principal do §9 mapa).
 */
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop-only");
});

test.describe("conta", () => {
  test("edita o perfil (nome + avatar por URL) com sucesso", async ({ page }) => {
    await loginViaUI(page, "collector", { scenario: "default", seed: 1, redirect: "/profile" });
    await expect(page.getByRole("heading", { name: "Perfil do colecionador" })).toBeVisible();

    await page.getByLabel("Nome de exibição").fill("Ava Renomeada");
    await page.getByLabel("Avatar (URL)").fill("https://picsum.photos/seed/nova/200/200");
    await page.getByRole("button", { name: "Salvar perfil" }).click();

    // Resultado: toast de sucesso e persistência (recarrega e o novo nome continua no campo).
    await expect(page.getByText("Perfil atualizado.")).toBeVisible();
    await gotoWithScenario(page, "/profile", { scenario: "default", seed: 1 });
    await expect(page.getByLabel("Nome de exibição")).toHaveValue("Ava Renomeada");
  });

  test("perfil com nome vazio mostra erro de validação acessível", async ({ page }) => {
    await loginViaUI(page, "collector", { scenario: "default", seed: 1, redirect: "/profile" });
    await expect(page.getByLabel("Nome de exibição")).toBeVisible();

    await page.getByLabel("Nome de exibição").fill("");
    await page.getByRole("button", { name: "Salvar perfil" }).click();

    await expect(page.getByText("Informe um nome de exibição.")).toBeVisible();
    // O campo fica marcado como inválido (a11y).
    await expect(page.getByLabel("Nome de exibição")).toHaveAttribute("aria-invalid", "true");
  });

  test("avatar com URL inválida mostra erro", async ({ page }) => {
    await loginViaUI(page, "collector", { scenario: "default", seed: 1, redirect: "/profile" });
    await expect(page.getByLabel("Avatar (URL)")).toBeVisible();

    await page.getByLabel("Avatar (URL)").fill("nao-e-url");
    await page.getByRole("button", { name: "Salvar perfil" }).click();

    await expect(page.getByText("URL inválida.")).toBeVisible();
  });

  test("troca de senha com confirmação divergente mostra erro", async ({ page }) => {
    await loginViaUI(page, "collector", { scenario: "default", seed: 1, redirect: "/profile" });
    await expect(page.getByRole("heading", { name: "Alterar senha" })).toBeVisible();

    await page.getByRole("textbox", { name: "Senha atual", exact: true }).fill("password123");
    await page.getByRole("textbox", { name: "Nova senha", exact: true }).fill("novaSenha123");
    await page.getByRole("textbox", { name: "Confirmar nova senha", exact: true }).fill("outraCoisa456");
    await page.getByRole("button", { name: "Alterar senha" }).click();

    await expect(page.getByText("As senhas não coincidem.")).toBeVisible();
  });

  test("troca de senha válida tem sucesso e limpa os campos", async ({ page }) => {
    await loginViaUI(page, "collector", { scenario: "default", seed: 1, redirect: "/profile" });
    await expect(page.getByRole("heading", { name: "Alterar senha" })).toBeVisible();

    await page.getByRole("textbox", { name: "Senha atual", exact: true }).fill("password123");
    await page.getByRole("textbox", { name: "Nova senha", exact: true }).fill("novaSenhaForte123");
    await page.getByRole("textbox", { name: "Confirmar nova senha", exact: true }).fill("novaSenhaForte123");
    await page.getByRole("button", { name: "Alterar senha" }).click();

    await expect(page.getByText("Senha alterada.")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Senha atual", exact: true })).toHaveValue("");
  });

  test("cadastra uma nova carteira e ela aparece na lista", async ({ page }) => {
    await loginViaUI(page, "collector", { scenario: "default", seed: 1, redirect: "/wallets" });
    await expect(page.getByRole("heading", { name: "Carteiras", exact: true })).toBeVisible();

    const form = page.getByTestId("wallet-form");
    await form.getByLabel("Nome de exibição / Apelido").fill("Carteira de testes");
    await form.getByLabel("Endereço da carteira").fill("0xTEST000000000000000000000000000000000099");
    await page.getByRole("button", { name: "Salvar carteira" }).click();

    // Resultado: toast + a nova carteira na lista.
    await expect(page.getByText("Carteira cadastrada.")).toBeVisible();
    await expect(page.getByText("Carteira de testes")).toBeVisible();
  });

  test("carteira com campos vazios mostra erros de validação", async ({ page }) => {
    await loginViaUI(page, "collector", { scenario: "default", seed: 1, redirect: "/wallets" });
    const form = page.getByTestId("wallet-form");
    await expect(form).toBeVisible();

    // Submete com label/endereço vazios.
    await form.getByLabel("Nome de exibição / Apelido").fill("");
    await form.getByLabel("Endereço da carteira").fill("");
    await page.getByRole("button", { name: "Salvar carteira" }).click();

    await expect(page.getByText("Informe um nome de exibição.")).toBeVisible();
    await expect(page.getByText("Informe o endereço da carteira.")).toBeVisible();
  });
});
