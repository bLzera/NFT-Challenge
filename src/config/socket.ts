/**
 * URL lógica do Socket.IO. Como não há servidor real, o cliente (Fase 3) conecta a uma URL
 * fixa interceptada pelo WebSocket interceptor do MSW (`@mswjs/socket.io-binding`) — nenhuma
 * conexão de rede real acontece, o que mantém o deploy estático (Vercel) funcional.
 *
 * O cliente DEVE forçar `transports: ["websocket"]`: o MSW intercepta apenas WebSocket, não o
 * fallback de long-polling (XHR) do Socket.IO.
 */
export const SOCKET_URL = "ws://nft-marketplace.mock";
export const SOCKET_PATH = "/socket.io/";

/** URL completa que o `ws.link` do MSW intercepta. */
export const SOCKET_LINK = `${SOCKET_URL}${SOCKET_PATH}`;
