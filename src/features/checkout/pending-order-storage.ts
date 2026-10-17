import type { OrderId } from "@/contracts";

/**
 * Recuperação de pedido pendente (A9): persiste **apenas o `orderId`** da tentativa em voo — nunca
 * dados do pedido — para que um refresh/reconexão não perca a referência. `getOrder(orderId)`
 * reconcilia o estado real ao montar o checkout; o `idempotencyKey` (em memória, não persistido)
 * garante que nenhuma nova tentativa crie um segundo pedido para o mesmo carrinho.
 */
const STORAGE_KEY = "nft-checkout:v1:pending-order";

export function readPendingOrderId(): OrderId | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (raw as OrderId) : undefined;
  } catch {
    return undefined;
  }
}

export function writePendingOrderId(orderId: OrderId): void {
  try {
    localStorage.setItem(STORAGE_KEY, orderId);
  } catch {
    // Armazenamento indisponível (ex.: modo privado) — a recuperação pós-refresh degrada
    // graciosamente; a tentativa em curso (estado em memória) continua funcionando.
  }
}

export function clearPendingOrderId(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ver nota acima.
  }
}
