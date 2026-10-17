import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Cart, UpdateCartItemRequest } from "@/contracts";
import { updateCartItem } from "@/lib/http/api";
import { keys } from "@/lib/query/keys";

/**
 * Atualiza a quantidade de um item (A4) — servidor como verdade, espelha `use-add-to-cart`.
 * `retry: 0`: um 409 de disponibilidade não é falha transitória. `onSuccess` grava o `Cart`
 * retornado em `keys.cart` (o badge do header reflete na hora). Em erro, nada é escrito.
 */
export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  return useMutation<Cart, unknown, UpdateCartItemRequest>({
    mutationFn: (body) => updateCartItem(body),
    retry: 0,
    onSuccess: (cart) => {
      queryClient.setQueryData<Cart>(keys.cart, cart);
    },
  });
}
