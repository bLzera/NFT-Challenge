import { setupWorker } from "msw/browser";
import { restHandlers } from "./handlers";
import { socketHandlers } from "./socket";

/**
 * Service Worker do MSW no browser (Fase 2).
 *
 * Registra os handlers REST (`/api/*`) e o servidor-socket (`@mswjs/socket.io-binding`),
 * ambos sobre o mesmo store. Requisições não interceptadas são repassadas à rede
 * (`onUnhandledRequest: "bypass"` em `enable.ts`).
 */
export const worker = setupWorker(...restHandlers, ...socketHandlers);
