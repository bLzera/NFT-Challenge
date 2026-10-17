import { redirect } from "@tanstack/react-router";
import type { Session } from "@/contracts";
import { keys } from "@/lib/query/keys";
import { queryClient } from "@/lib/query/query-client";

/**
 * Normaliza o destino de retorno pós-autenticação (search `redirect`) para um **caminho interno
 * seguro**. Só aceita rotas que começam com uma única "/" (path relativo da própria app); rejeita
 * URLs absolutas e protocol-relative (`//evil.com`) para evitar open-redirect (spec §Roteamento).
 */
export function safeInternalPath(redirectTarget: string | undefined): string {
  if (
    typeof redirectTarget === "string" &&
    redirectTarget.startsWith("/") &&
    !redirectTarget.startsWith("//")
  ) {
    return redirectTarget;
  }
  return "/";
}

/**
 * Guarda das rotas `/login` e `/register` (`beforeLoad`): se já há sessão no cache (`keys.session`),
 * não faz sentido autenticar de novo → redireciona para o destino de retorno (`redirect ?? "/"`).
 * Espelha `requireAuth`, apenas **lendo** o cache (populado por `bootSession` antes do primeiro
 * render), sem disparar fetch.
 */
export function redirectIfAuthenticated(redirectTarget: string | undefined): void {
  const session = queryClient.getQueryData<Session | null>(keys.session);
  if (session) {
    throw redirect({ to: safeInternalPath(redirectTarget) });
  }
}
