import { useQueries, useQuery } from "@tanstack/react-query";
import type { Nft } from "@/contracts";
import { getFavorites, getNft } from "@/lib/http/api";
import { keys } from "@/lib/query/keys";

interface NftResolution {
  nftId: string;
  query: { data: Nft | undefined; isPending: boolean; isError: boolean; error: unknown };
}

/**
 * Leitura da lista de favoritos (A-fav-1): `getFavorites` traz só `nftIds`; cada um é resolvido via
 * `getNft` chaveado por `keys.nft.detail(id)` — mesma chave do detalhe, cache compartilhado, os
 * eventos `nft.updated` do socket reconciliam automaticamente (preço/disponibilidade refletem em
 * tempo real, a UI só lê o cache).
 */
export function useFavoritesList() {
  const favoritesQuery = useQuery({
    queryKey: keys.favorites,
    queryFn: getFavorites,
  });

  const nftIds = favoritesQuery.data?.nftIds ?? [];

  const nftQueries = useQueries({
    queries: nftIds.map((nftId) => ({
      queryKey: keys.nft.detail(nftId),
      queryFn: () => getNft(nftId),
    })),
  });

  const resolutions: NftResolution[] = nftIds.map((nftId, i) => ({
    nftId,
    query: nftQueries[i],
  }));

  return {
    favoritesQuery,
    nftIds,
    resolutions,
  };
}
