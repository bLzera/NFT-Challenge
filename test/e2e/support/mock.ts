import type { Page } from "@playwright/test";

/**
 * Controle de cenário/seed do mock (ver src/mock/scenario.ts). Cada teste parte de estado isolado:
 * o `page` fixture do Playwright já dá um contexto novo (localStorage limpo) por teste; aqui apenas
 * dirigimos o cenário determinístico via `?scenario=&seed=` (aplicado no boot) e garantimos o reset
 * do store a um estado conhecido.
 */

export interface ScenarioOptions {
  scenario?: string;
  seed?: number;
}

const MOCK_READY_TIMEOUT = 15_000;

/** Espera `window.__mock` existir (instalado durante o bootstrap de mocks). */
export async function waitForMock(page: Page): Promise<void> {
  await page.waitForFunction(() => typeof window.__mock !== "undefined", undefined, {
    timeout: MOCK_READY_TIMEOUT,
  });
}

/** Navega para `path` já com o cenário/seed nos query params e aguarda o mock pronto. */
export async function gotoWithScenario(
  page: Page,
  path: string,
  { scenario = "default", seed = 1 }: ScenarioOptions = {},
): Promise<void> {
  const sep = path.includes("?") ? "&" : "?";
  await page.goto(`${path}${sep}scenario=${encodeURIComponent(scenario)}&seed=${seed}`);
  await waitForMock(page);
}

/** Troca o cenário em runtime (reinicia o store). Útil para mudar de estado no meio do teste. */
export async function setScenario(page: Page, scenario: string): Promise<void> {
  await waitForMock(page);
  await page.evaluate((id) => window.__mock?.scenario(id), scenario);
}

/** Restaura o store ao estado inicial do cenário atual. */
export async function resetStore(page: Page): Promise<void> {
  await waitForMock(page);
  await page.evaluate(() => window.__mock?.reset());
}

declare global {
  interface Window {
    __mock?: {
      scenario: (id: string) => unknown;
      seed: (n: number) => unknown;
      reset: () => unknown;
      current: () => { scenario: string; seed: number };
    };
  }
}
