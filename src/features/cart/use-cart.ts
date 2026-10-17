import { useQuery } from "@tanstack/react-query";
import { getCart } from "@/lib/http/api";
import { keys } from "@/lib/query/keys";

/**
 * Leitura do carrinho (critério de aceitação 1): fonte da tela `/cart`. O header já lê `keys.cart`
 * do cache (via `skipToken`) para o badge; ao montar esta tela, o `queryFn` real passa a abastecer
 * tanto a tela quanto o badge — mesma chave, mesmo cache.
 */
export function useCart() {
  return useQuery({ queryKey: keys.cart, queryFn: getCart });
}
