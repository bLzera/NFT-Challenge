import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { queryClient } from "@/lib/query/query-client";
import { router } from "@/app/router";

/** Providers globais: cache remoto (Query) + roteamento (Router). */
export function AppProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
