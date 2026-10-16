import { worker } from "@/mock/browser";
import { installScenarios } from "@/mock/scenarios";

/**
 * Ativa a camada de mock: instala o controle de cenários (`window.__mock` + query params),
 * carrega o store (persistido ou semeado) e sobe o Service Worker do MSW antes do primeiro render.
 *
 * Deve ser aguardada no bootstrap para garantir que nenhuma requisição saia
 * antes do worker estar pronto.
 */
export async function enableMocks(): Promise<void> {
  // Pluga o reset real do store nos controles e aplica o cenário inicial.
  installScenarios();

  await worker.start({
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    onUnhandledRequest: "bypass",
    quiet: true,
  });
}
