import { QueryClient } from "@tanstack/react-query";
import { shouldRetry } from "./retry";

/**
 * QueryClient da aplicação.
 *
 * Política de cache (Fase 3 — camada de dados): dados ficam "frescos" por um curto período para
 * reduzir refetch, mas o tempo real via Socket.IO é a fonte primária de atualização (os eventos
 * escrevem direto no cache — ver lib/realtime). O `retry` é por `code` (ver retry.ts): não retenta
 * 4xx de contrato, retenta 1x `transient`/queda de rede. Mutations não retentam.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: shouldRetry,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
