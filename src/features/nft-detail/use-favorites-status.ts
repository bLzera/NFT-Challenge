import { useQuery } from "@tanstack/react-query";
import type { NftId } from "@/contracts";
import { getFavorites } from "@/lib/http/api";
import { keys } from "@/lib/query/keys";

/**
 * Leitura de "este NFT está favoritado?" (A6). Nenhuma outra feature ainda popula `keys.favorites`
 * por query, então esta feature assume a leitura: `enabled: isAuthenticated` evita chamar a API sem
 * sessão (ação de favoritar é gated — A5). O toggle em si é `useToggleFavorite` (`@/lib/favorites`),
 * reusado sem redeclarar o padrão otimista+rollback.
 */
export function useFavoritesStatus(nftId: NftId, isAuthenticated: boolean) {
  const query = useQuery({
    queryKey: keys.favorites,
    queryFn: getFavorites,
    enabled: isAuthenticated,
  });
  const isFavorited = query.data?.nftIds.includes(nftId) ?? false;
  return { isFavorited, isPending: query.isPending };
}
