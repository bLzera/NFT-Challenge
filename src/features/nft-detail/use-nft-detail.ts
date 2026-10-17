import { useQuery } from "@tanstack/react-query";
import { getNft } from "@/lib/http/api";
import { keys } from "@/lib/query/keys";

/**
 * Hook de leitura colado à feature (A3), espelhando `use-nft-list.ts`. `idOrSlug` é passado **cru**
 * da URL para `getNft`/`keys.nft.detail` — o backend resolve id↔slug (A2); não normalizamos aqui.
 * Sem `useState` de dados: preço/`editionsAvailable`/`version` vêm sempre do cache, que o realtime
 * (`onNftUpdated`, camada de dados) já mantém atualizado via `setQueriesData` — esta feature só lê.
 */
export function useNftDetail(idOrSlug: string) {
  return useQuery({
    queryKey: keys.nft.detail(idOrSlug),
    queryFn: () => getNft(idOrSlug),
  });
}
