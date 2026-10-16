/**
 * Servidor-socket mockado (ver mock.spec.md § Servidor-socket).
 *
 * Usa `@mswjs/socket.io-binding` sobre o `ws` do MSW: o cliente `socket.io-client` (Fase 3)
 * conecta à URL lógica `SOCKET_LINK` e nenhuma conexão de rede real acontece. O servidor assina
 * os domain-events do store — então toda mudança feita via REST é refletida como evento (§6).
 *
 * Isolamento por usuário (§7, eliminatório §11): cada conexão informa seu token num handshake
 * `auth`; `order.updated` só é entregue às conexões do dono do pedido. `nft.updated` é público
 * (catálogo), então vai a todas as conexões.
 *
 * Limitações do transporte (documentar no ARCHITECTURE.md, Fase 7): o binding cobre o essencial
 * do protocolo (connect + eventos nomeados); salas/namespaces/ack não são usados. O cliente deve
 * forçar `transports: ["websocket"]` — o MSW não intercepta o long-polling (XHR) do Socket.IO.
 */
import { ws } from "msw";
import { toSocketIo } from "@mswjs/socket.io-binding";
import { SOCKET_EVENT_NAMES, type UserId } from "@/contracts";
import { SOCKET_LINK } from "@/config/socket";
import { store } from "@/mock/store";
import { buildNftEvent, buildOrderEvent } from "./events";

type Io = ReturnType<typeof toSocketIo>;

interface Connection {
  io: Io;
  userId: UserId | null;
}

const connections = new Set<Connection>();

// Assina os domain-events do store UMA vez; distribui aos clientes conectados.
store.subscribe((event) => {
  if (event.kind === "nft.updated") {
    const envelope = buildNftEvent(event.nft);
    for (const conn of connections) {
      conn.io.client.emit(SOCKET_EVENT_NAMES.nftUpdated, envelope);
    }
    return;
  }
  // order.updated → apenas o dono do pedido (isolamento por usuário).
  const envelope = buildOrderEvent(event.order);
  for (const conn of connections) {
    if (conn.userId === event.userId) {
      conn.io.client.emit(SOCKET_EVENT_NAMES.orderUpdated, envelope);
    }
  }
});

// No reset/troca de cenário os tokens antigos deixam de valer; força re-handshake das conexões
// vivas (§7: não entregar eventos a um dono resolvido de uma sessão que não existe mais).
store.onReset(() => {
  for (const conn of connections) conn.userId = null;
});

const link = ws.link(SOCKET_LINK);

export const socketHandlers = [
  link.addEventListener("connection", (connection) => {
    const io = toSocketIo(connection);
    const conn: Connection = { io, userId: null };
    connections.add(conn);

    // Handshake de identidade: o cliente emite `auth` com seu token após conectar.
    io.client.on("auth", (_event, token) => {
      conn.userId = store.resolveUser(typeof token === "string" ? token : null);
    });

    connection.client.addEventListener("close", () => {
      connections.delete(conn);
    });
  }),
];

/** Exposto p/ testes: nº de conexões ativas. */
export function activeConnectionCount(): number {
  return connections.size;
}
