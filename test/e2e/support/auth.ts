import { expect, type Page } from "@playwright/test";
import { gotoWithScenario, type ScenarioOptions } from "./mock";

/** Credenciais fictícias semeadas (src/mock/fixtures/users.ts). */
export const USERS = {
  collector: { email: "collector@example.com", password: "password123", displayName: "Ava Collector" },
  trader: { email: "trader@example.com", password: "password123", displayName: "Beto Trader" },
} as const;

export type UserKey = keyof typeof USERS;

/**
 * Login pela UI (fluxo real: `/login` → formulário RHF → `useLogin` → sessão). Verifica o resultado
 * saindo da rota de login. `redirect` opcional reproduz o anti-open-redirect da feature auth.
 */
export async function loginViaUI(
  page: Page,
  user: UserKey = "collector",
  opts: ScenarioOptions & { redirect?: string } = {},
): Promise<void> {
  const { email, password } = USERS[user];
  const path = opts.redirect ? `/login?redirect=${encodeURIComponent(opts.redirect)}` : "/login";
  await gotoWithScenario(page, path, opts);

  await page.getByLabel("E-mail").fill(email);
  // `{ exact: true }`: o PasswordInput tem um botão "Mostrar senha" cujo aria-label contém "senha",
  // então o match por substring resolveria 2 elementos.
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();

  // Sai da tela de login ao autenticar (sucesso observável).
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}
