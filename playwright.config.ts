import { defineConfig, devices } from "@playwright/test";

/**
 * Config E2E (Fase 5, ver test/e2e/e2e.spec.md). App real + mocks MSW (REST) e socket.io-client
 * (tempo real). Dois projetos: desktop (1440×900) e mobile (390×844), alvos do README §8. O
 * `webServer` sobe o Vite dev (mocks ligados por padrão em `src/config/env.ts`).
 */
const PORT = 5173;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "test/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      // Emulação de LARGURA mobile (390×844, alvo do README §8), não de dispositivo: usa Desktop
      // Chrome com viewport estreito e `isMobile:false` — sem user-agent/touch móveis (evita
      // flakiness de toque; o eixo responsivo é de layout, não de capacidades de dispositivo).
      name: "mobile",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: false },
    },
  ],

  webServer: {
    command: "npm run dev -- --port 5173 --strictPort",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
