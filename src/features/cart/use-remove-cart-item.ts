import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Cart, NftId } from "@/contracts";
import { removeCartItem } from "@/lib/http/api";
import { keys } from "@/lib/query/keys";

/**
 * Remove um item do carrinho (A4) — servidor como verdade. `retry: 0`. `onSuccess` grava o `Cart`
 * retornado em `keys.cart` (carrinho vazio → `EmptyState` na tela, badge zera no header).
 */
export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation<Cart, unknown, NftId>({
    mutationFn: (nftId) => removeCartItem(nftId),
    retry: 0,
    onSuccess: (cart) => {
      queryClient.setQueryData<Cart>(keys.cart, cart);
    },
  });
}
