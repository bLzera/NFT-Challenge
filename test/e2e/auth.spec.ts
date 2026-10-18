import { expect, test } from "@playwright/test";
import { gotoWithScenario, waitForMock } from "./support/mock";
import { USERS, loginViaUI } from "./support/auth";

/**
 * Fluxo §9.3 — cadastro, login, expiração de sessão, logout, troca de usuário (isolamento).
 * Desktop-only: o AuthDialog é full-screen no mobile mas o fluxo é idêntico; não é fluxo "principal"
 * (§9 mapa), então mantemos só no desktop para o custo da suíte. A UI em si não quebra no mobile.
 */
// Desktop-only: pula no projeto mobile (AuthDialog idêntico; não é fluxo principal do §9 mapa).
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop-only");
});

test.describe("autenticação", () => {
  test("cadastro com e-mail novo autentica e volta ao destino", async ({ page }) => {
    await gotoWithScenario(page, "/register", { scenario: "default", seed: 1 });

    const unique = `novo-${Date.now()}@example.com`;
    await page.getByLabel("Nome de usuário").fill("Pessoa Nova");
    await page.getByLabel("E-mail").fill(unique);
    await page.getByLabel("Senha", { exact: true }).fill("password123");
    await page.getByLabel("Confirmar senha").fill("password123");
    await page.getByRole("button", { name: "Criar conta" }).click();

    // Sucesso: sai da tela de cadastro e a conta aparece no header.
    await expect(page).not.toHaveURL(/\/register/);
    await expect(page.getByRole("button", { name: /Pessoa Nova|Minha conta/ })).toBeVisible();
  });

  test("cadastro com e-mail em conflito mostra erro no campo e-mail", async ({ page }) => {
    await gotoWithScenario(page, "/register", { scenario: "register-conflict", seed: 1 });

    await page.getByLabel("Nome de usuário").fill("Qualquer");
    await page.getByLabel("E-mail").fill("conflito@example.com");
    await page.getByLabel("Senha", { exact: true }).fill("password123");
    await page.getByLabel("Confirmar senha").fill("password123");
    await page.getByRole("button", { name: "Criar conta" }).click();

    // Permanece na tela e mostra erro acessível (sem fabricar sessão).
    await expect(page).toHaveURL(/\/register/);
    await expect(page.getByRole("alert").first()).toBeVisible();
  });

  test("login autentica e exibe a conta no header", async ({ page }) => {
    await loginViaUI(page, "collector", { scenario: "default", seed: 1 });
    await expect(page.getByRole("button", { name: /Ava Collector/ })).toBeVisible();
  });

  test("logout encerra a sessão: rota privada passa a exigir login", async ({ page }) => {
    await loginViaUI(page, "collector", { scenario: "default", seed: 1 });
    await page.getByRole("button", { name: /Ava Collector/ }).click();
    const sair = page.getByRole("menuitem", { name: "Sair" });
    await expect(sair).toBeVisible();
    await sair.click();

    // signOut() limpa o token de forma assíncrona (chama a API). Espera o token sumir antes de
    // recarregar, senão o reboot re-hidrataria a sessão.
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("nft-auth:v1:token")))
      .toBeNull();

    // Efeito observável do logout: ao recarregar o app entra em estado de visitante (header "Entrar")
    // e uma rota privada passa a redirecionar para /login (a sessão foi realmente encerrada).
    await page.reload();
    await waitForMock(page);
    await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible();

    await page.goto("/profile");
    await waitForMock(page);
    await expect(page).toHaveURL(/\/login/);
  });

  test("sessão expirada redireciona rota privada para o login", async ({ page }) => {
    // session-expired: TTL 2s → ao navegar para rota privada após expirar, cai no /login.
    await loginViaUI(page, "collector", { scenario: "session-expired", seed: 1 });

    // Aguarda a expiração do TTL e tenta acessar rota privada.
    await page.waitForTimeout(2500);
    await page.goto("/profile");
    await waitForMock(page);

    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    await expect(page).toHaveURL(new RegExp(encodeURIComponent("/profile")));
  });

  test("troca de usuário isola os dados (favoritos não vazam)", async ({ page }) => {
    // Ava favorita nft-001 e nft-013; Beto favorita nft-007.
    await loginViaUI(page, "collector", { scenario: "default", seed: 1 });
    await page.goto("/favorites");
    await waitForMock(page);
    await expect(page.getByTestId("nft-card").first()).toBeVisible();
    const avaFavs = await page.getByTestId("nft-card").count();
    expect(avaFavs).toBe(2);

    // Logout (espera o token sumir antes de reentrar como outro usuário).
    await page.getByRole("button", { name: /Ava Collector/ }).click();
    await page.getByRole("menuitem", { name: "Sair" }).click();
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("nft-auth:v1:token")))
      .toBeNull();
    await page.goto("/login");
    await waitForMock(page);

    // Entra como Beto — favoritos devem ser os dele (1), não os de Ava (isolamento, sem vazar cache).
    await page.getByLabel("E-mail").fill(USERS.trader.email);
    await page.getByLabel("Senha", { exact: true }).fill(USERS.trader.password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).not.toHaveURL(/\/login/);

    await page.goto("/favorites");
    await waitForMock(page);
    await expect(page.getByTestId("nft-card").first()).toBeVisible();
    const betoFavs = await page.getByTestId("nft-card").count();
    expect(betoFavs).toBe(1);
  });
});
