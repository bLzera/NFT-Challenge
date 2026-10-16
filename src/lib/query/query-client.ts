import { QueryClient } from "@tanstack/react-query";

/**
 * QueryClient da aplicação.
 *
 * Política base de cache (refinada na Fase 3 — camada de dados): dados ficam
 * "frescos" por um curto período para reduzir refetch, mas o tempo real via
 * Socket.IO é a fonte primária de atualização. Retries conservadores para não
 * mascarar cenários de falha simulados.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
