/**
 * Constrói os envelopes de evento Socket.IO (contrato da Fase 1) a partir do estado do store.
 * Cada evento carrega identidade estável (`id`), recurso afetado e `version` — permitindo ao
 * cliente (Fase 3) descartar duplicatas/antigos sem regredir estado (§7).
 */
import type { Nft, NftUpdatedEvent, Order, OrderUpdatedEvent } from "@/contracts";

let seq = 0;
function eventId(): string {
  return `evt-${Date.now()}-${++seq}`;
}

export function buildNftEvent(nft: Nft): NftUpdatedEvent {
  return {
    id: eventId(),
    type: "nft.updated",
    resource: { type: "nft", id: nft.id },
    version: nft.version,
    at: new Date().toISOString(),
    payload: { priceEth: nft.priceEth, editionsAvailable: nft.editionsAvailable },
  };
}

export function buildOrderEvent(order: Order): OrderUpdatedEvent {
  // Só emitido em transições terminais; o status é sempre confirmed/declined aqui.
  const status = order.status === "declined" ? "declined" : "confirmed";
  return {
    id: eventId(),
    type: "order.updated",
    resource: { type: "order", id: order.id },
    version: order.version,
    at: new Date().toISOString(),
    payload: { status, ...(order.txRef ? { txRef: order.txRef } : {}) },
  };
}
