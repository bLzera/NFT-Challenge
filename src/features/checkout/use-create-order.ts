import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateOrderRequest, Order } from "@/contracts";
import { createOrder } from "@/lib/http/api";
import { keys } from "@/lib/query/keys";

/**
 * Criação de pedido (A7/A9). `retry: 0`: o retry é ação explícita do usuário reusando o mesmo
 * `idempotencyKey` (nunca a mutation sozinha). O `onSuccess` **semeia** `keys.order.detail(order.id)`
 * — obrigatório para `order.updated` (socket) encontrar a entrada e aplicar a transição terminal
 * (`onOrderUpdated` só patcheia se `order` já existir no cache). Espelha o padrão de
 * `setQueryData` de `use-add-to-cart`/`use-toggle-favorite`. Sem otimismo: o pedido só existe quando
 * o servidor confirma (201 original ou 200 replay).
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation<Order, unknown, CreateOrderRequest>({
    mutationFn: (body) => createOrder(body),
    retry: 0,
    onSuccess: (order) => {
      queryClient.setQueryData(keys.order.detail(order.id), order);
    },
  });
}
