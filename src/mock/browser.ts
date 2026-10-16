import { setupWorker } from "msw/browser";

/**
 * Service Worker do MSW no browser.
 *
 * Os handlers REST e o servidor-socket são registrados na Fase 2. Por ora o
 * worker sobe sem handlers — qualquer requisição não interceptada é repassada
 * à rede (onUnhandledRequest: "bypass"), o que mantém o app funcional.
 */
export const worker = setupWorker();
