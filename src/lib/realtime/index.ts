/**
 * API pública do tempo real (ver data.spec.md § lib/realtime · index.ts · decisões #6/#7).
 *
 * Orquestra o cliente Socket.IO:
 *  - handshake `auth` por token no `connect` e a cada `reconnect` (o servidor-mock resolve o dono a
 *    partir do token — isolamento por usuário, eliminatório §11);
 *  - listeners `nft.updated`/`order.updated` → aplicação no cache com dedupe por `version`;
 *  - reconciliação pós-reconexão: invalida as queries ativas (cobre eventos perdidos na queda); o
 *    dedupe por `version` evita regressão quando refetch e evento chegam juntos;
 *  - teardown no logout/troca de usuário: desconecta, zera versões e limpa o cache (nenhum dado de
 *    um usuário sobrevive para a sessão seguinte).
 */
import type { QueryClient } from "@tanstack/react-query";
import type { Socket } from "socket.io-client";
import { SOCKET_EVENT_NAMES } from "@/contracts";
import { clearVersions, onNftUpdated, onOrderUpdated } from "./apply-events";
import { createSocket } from "./socket";

let socket: Socket | null = null;
let client: QueryClient | null = null;
let currentToken: string | null = null;

/** Emite o handshake de identidade com o token atual (no connect e em cada reconexão). */
function sendHandshake(): void {
  if (socket && currentToken) socket.emit("auth", currentToken);
}

/** Registra os listeners uma única vez. Idempotente: chamadas repetidas não reempilham handlers. */
export function initRealtime(queryClient: QueryClient): void {
  if (socket) return;
  client = queryClient;
  socket = createSocket();

  socket.on("connect", sendHandshake);

  // `io.on("reconnect")` (manager): reautentica e reconcilia o cache. Sem token (pós-teardown/logout)
  // não há o que reconciliar — evita refetch de queries sem Authorization logo após o logout.
  socket.io.on("reconnect", () => {
    if (!currentToken) return;
    sendHandshake();
    client?.invalidateQueries({ type: "active" });
  });

  socket.on(SOCKET_EVENT_NAMES.nftUpdated, (raw: unknown) => {
    if (client) onNftUpdated(client, raw);
  });
  socket.on(SOCKET_EVENT_NAMES.orderUpdated, (raw: unknown) => {
    if (client) onOrderUpdated(client, raw);
  });
}

/** Conecta (ou reenvia o handshake, se já conectado) com o token informado. */
export function connectRealtime(token: string): void {
  currentToken = token;
  if (!socket) return;
  if (socket.connected) sendHandshake();
  else socket.connect();
}

/**
 * Teardown de dados do usuário: desconecta o socket, esquece as versões aplicadas e limpa o cache.
 * Chamado no logout e na troca de usuário.
 */
export function teardownUserData(): void {
  currentToken = null;
  socket?.disconnect();
  clearVersions();
  client?.clear();
}

/** Exposto p/ testes: referência do socket atual (null antes de `initRealtime`). */
export function getSocket(): Socket | null {
  return socket;
}
