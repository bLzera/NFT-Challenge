import { useQuery } from "@tanstack/react-query";
import type { OrderId } from "@/contracts";
import { getOrder } from "@/lib/http/api";
import { keys } from "@/lib/query/keys";

/**
 * Leitura do pedido para a tela de confirmação (A5/A10 do `order-confirmation.spec.md`). Hook
 * colado à feature (espelha `src/features/checkout/use-order.ts` propositalmente — mesma
 * `queryKey`/`queryFn`/`enabled`/`retry: 0` — para que os caches coincidam sem acoplar as duas
 * features irmãs). Deep-link/refresh direto refetcha do servidor mock; navegação vinda do checkout
 * serve do cache já semeado em `use-create-order`. `order.updated` (socket) é aplicado por
 * `@/lib/realtime` em `keys.order.detail` — esta query só reflete a mudança de cache.
 */
export function useOrderConfirmation(orderId: OrderId) {
  return useQuery({
    queryKey: keys.order.detail(orderId),
    queryFn: () => getOrder(orderId),
    enabled: Boolean(orderId),
    retry: 0,
  });
}
