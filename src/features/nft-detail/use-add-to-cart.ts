import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AddCartItemRequest, Cart } from "@/contracts";
import { addCartItem } from "@/lib/http/api";
import { keys } from "@/lib/query/keys";

/**
 * Mutation de "Adicionar ao carrinho" / "Comprar" (A7), colada à feature — não depende da tela de
 * `cart`. `retry: 0`: um 409 de disponibilidade não é falha transitória; não insiste sozinha.
 * `onSuccess` escreve o `Cart` retornado em `keys.cart` (fonte de verdade do servidor — sem
 * otimismo, pois estoque/versão têm que vir do backend): o badge do header, que lê `keys.cart` do
 * cache, reflete na hora. Em erro, nada é escrito (`keys.cart` permanece intocado).
 */
export function useAddToCart() {
  const queryClient = useQueryClient();
  return useMutation<Cart, unknown, AddCartItemRequest>({
    mutationFn: (body) => addCartItem(body),
    retry: 0,
    onSuccess: (cart) => {
      queryClient.setQueryData<Cart>(keys.cart, cart);
    },
  });
}
