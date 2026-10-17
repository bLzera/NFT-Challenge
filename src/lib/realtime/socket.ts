/**
 * Fábrica do cliente Socket.IO (ver data.spec.md § lib/realtime · socket.ts · decisão #8).
 *
 * Conecta à URL lógica interceptada pelo binding MSW (`@/config/socket`) — nenhuma rede real. Força
 * `transports: ["websocket"]` porque o MSW não intercepta o fallback long-polling (XHR) do Socket.IO.
 * `autoConnect: false`: quem orquestra a sessão decide quando conectar (após resolver o token).
 */
import { io, type Socket } from "socket.io-client";
import { SOCKET_PATH, SOCKET_URL } from "@/config/socket";

export function createSocket(): Socket {
  return io(SOCKET_URL, {
    path: SOCKET_PATH,
    transports: ["websocket"],
    autoConnect: false,
  });
}
