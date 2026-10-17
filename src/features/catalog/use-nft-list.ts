import { useQuery } from "@tanstack/react-query";
import type { ListNftsQuery } from "@/contracts";
import { listNfts } from "@/lib/http/api";
import { keys } from "@/lib/query/keys";

/**
 * Hook de leitura colado à feature (decisão da Fase 3: hooks por recurso ficam na feature que os
 * consome). `query` é o `search` da rota `/`, já validado/normalizado por `listNftsQuerySchema`
 * (ver router.tsx). Mesma URL → mesma `queryKey` (via `normalizeNftQuery` embutido em
 * `keys.nft.list`) → cache/dedupe/cancelamento de respostas obsoletas ficam a cargo do React Query
 * (política em `query-client`). Catálogo é somente leitura — nenhuma mutation nesta feature.
 */
export function useNftList(query: ListNftsQuery) {
  return useQuery({
    queryKey: keys.nft.list(query),
    queryFn: () => listNfts(query),
  });
}
