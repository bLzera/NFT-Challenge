import { useQuery } from "@tanstack/react-query";
import type { OrderId } from "@/contracts";
import { getOrder } from "@/lib/http/api";
import { keys } from "@/lib/query/keys";

/**
 * Leitura/recuperação de um pedido (A9): usada para reconciliar o `pending-order` persistido
 * (`localStorage`) ao montar o checkout — se o pedido já é terminal, a tela navega para
 * `/order/$orderId`; se ainda `pending`, o estado "confirmando" é retomado sem criar outro pedido.
 * `enabled: Boolean(orderId)` — não dispara sem um id.
 */
export function useOrder(orderId: OrderId | undefined) {
  return useQuery({
    queryKey: keys.order.detail(orderId ?? ""),
    queryFn: () => getOrder(orderId as OrderId),
    enabled: Boolean(orderId),
    retry: 0,
  });
}
