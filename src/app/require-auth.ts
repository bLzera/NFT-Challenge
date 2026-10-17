import { redirect } from "@tanstack/react-router";
import type { Session } from "@/contracts";
import { keys } from "@/lib/query/keys";
import { queryClient } from "@/lib/query/query-client";

/**
 * Guarda de rota privada (§3/§4). Usada em `beforeLoad` das rotas que exigem autenticação (checkout,
 * perfil, carteiras, favoritos, pedidos). Apenas **lê** a sessão do cache (fonte única
 * `keys.session`, populada por `bootSession` antes do primeiro render) — não busca — e redireciona
 * para `/login` preservando o destino em `redirect` para retomada do fluxo (§3).
 *
 * Refresh em rota privada funciona porque `bootSession()` revalida o token no bootstrap antes de o
 * router avaliar as guardas.
 */
export function requireAuth(redirectHref: string): void {
  const session = queryClient.getQueryData<Session | null>(keys.session);
  if (!session) {
    throw redirect({ to: "/login", search: { redirect: redirectHref } });
  }
}
