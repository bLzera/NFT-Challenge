import { useCallback } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { listNftsQuerySchema, type ListNftsQuery } from "@/contracts";

/**
 * Fonte única do estado de consulta (decisão A2): nada de `useState` para busca/filtros/sort/page —
 * tudo lê e escreve direto no `search` da rota `/` via `navigate`. `setFilters` aplica a regra §3:
 * qualquer mudança de busca/filtro/ordenação reinicia `page` para 1; só `setPage` preserva o resto.
 *
 * `useSearch` é tipado como `Partial<ListNftsQuery>` (ver router.tsx: campos com default marcados
 * opcionais para não exigir `search` em todo `<Link to="/">`). Em runtime o `validateSearch` já
 * preenche os defaults; reaplicar `listNftsQuerySchema.parse` aqui só reforça o tipo (`ListNftsQuery`
 * completo) para os componentes consumidores, sem redeclarar nenhum campo.
 */
export function useCatalogSearch() {
  const rawSearch = useSearch({ from: "/" });
  const search: ListNftsQuery = listNftsQuerySchema.parse(rawSearch);
  const navigate = useNavigate({ from: "/" });

  const setFilters = useCallback(
    (patch: Partial<Omit<ListNftsQuery, "page" | "pageSize">>) => {
      void navigate({
        search: (prev) => ({ ...prev, ...patch, page: 1 }),
      });
    },
    [navigate],
  );

  const setPage = useCallback(
    (page: number) => {
      void navigate({ search: (prev) => ({ ...prev, page }) });
    },
    [navigate],
  );

  return { search, setFilters, setPage };
}
