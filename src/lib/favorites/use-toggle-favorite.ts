/**
 * Toggle de favorito com atualização otimista + rollback (ver data.spec.md § Favoritos · §4).
 *
 * Referência do padrão otimista a ser reusado pela UI na Fase 4: a interação reflete na hora
 * (`onMutate` aplica o toggle no cache), reverte em erro (`onError` restaura o snapshot) e reconcilia
 * com o servidor no fim (`onSuccess` adota o `Favorites` real — com a `version` do servidor — e
 * `onSettled` invalida). A `version` NUNCA é inventada pelo cliente; só o servidor a incrementa.
 *
 * A lógica vive numa factory de `MutationOptions` (`toggleFavoriteMutationOptions`) para ser testável
 * sem renderizar React; o hook é um wrapper fino de `useMutation`.
 */
import { useMutation, useQueryClient, type QueryClient, type UseMutationOptions } from "@tanstack/react-query";
import { type Favorites, type NftId } from "@/contracts";
import { toggleFavorite } from "@/lib/http/api";
import { keys } from "@/lib/query/keys";

interface ToggleContext {
  previous: Favorites | undefined;
}

/** Aplica o toggle de `nftId` numa cópia do estado otimisticamente (sem tocar na `version`). */
function toggled(current: Favorites | undefined, nftId: NftId): Favorites {
  const base: Favorites = current ?? { nftIds: [], version: 0 };
  const has = base.nftIds.includes(nftId);
  return {
    ...base,
    nftIds: has ? base.nftIds.filter((id) => id !== nftId) : [...base.nftIds, nftId],
  };
}

export function toggleFavoriteMutationOptions(
  queryClient: QueryClient,
): UseMutationOptions<Favorites, unknown, NftId, ToggleContext> {
  return {
    mutationFn: (nftId: NftId) => toggleFavorite(nftId),

    onMutate: async (nftId) => {
      await queryClient.cancelQueries({ queryKey: keys.favorites });
      const previous = queryClient.getQueryData<Favorites>(keys.favorites);
      queryClient.setQueryData<Favorites>(keys.favorites, toggled(previous, nftId));
      return { previous };
    },

    onError: (_err, _nftId, context) => {
      // rollback: restaura exatamente o snapshot anterior à mutação.
      queryClient.setQueryData<Favorites | undefined>(keys.favorites, context?.previous);
    },

    onSuccess: (serverFavorites) => {
      // adota o estado do servidor (com a `version` autoritativa).
      queryClient.setQueryData<Favorites>(keys.favorites, serverFavorites);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: keys.favorites });
    },
  };
}

/** Hook de UI: toggle otimista de favorito. */
export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation(toggleFavoriteMutationOptions(queryClient));
}
