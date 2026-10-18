import { expect, test } from "@playwright/test";
import { gotoWithScenario } from "./support/mock";

/** Smoke: valida o harness ponta a ponta (dev server + MSW + render do catálogo via mocks). */
test("catálogo carrega via mocks", async ({ page }) => {
  await gotoWithScenario(page, "/", { scenario: "default", seed: 1 });

  // O store de mock está disponível (prova que a camada de mock subiu).
  const state = await page.evaluate(() => window.__mock?.current());
  expect(state?.scenario).toBe("default");

  // Catálogo renderiza cards reais vindos dos handlers REST interceptados.
  await expect(page.getByTestId("nft-card").first()).toBeVisible({ timeout: 15_000 });
});
