import { worker } from "@/mock/browser";
import { configureMockControls } from "@/mock/scenario";

/**
 * Ativa a camada de mock: instala o controle de cenários (`window.__mock` +
 * query params) e sobe o Service Worker do MSW antes do primeiro render.
 *
 * Deve ser aguardada no bootstrap para garantir que nenhuma requisição saia
 * antes do worker estar pronto.
 */
export async function enableMocks(): Promise<void> {
  // Reset do store será plugado pela Fase 2 (store + cenários).
  configureMockControls();

  await worker.start({
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    onUnhandledRequest: "bypass",
    quiet: true,
  });
}
