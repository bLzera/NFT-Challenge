/**
 * Orquestração de sessão (ver data.spec.md § lib/auth/session.ts · decisões #1/#2/#7).
 *
 * Amarra as três pontas da camada de dados em torno do ciclo de vida da sessão: o token (http), o
 * cache de sessão (query) e o tempo real (socket). A sessão é derivada de `GET /api/auth/session`
 * (`keys.session`); o token sobrevive a refresh via `token-store`. Login/logout e troca de usuário
 * disparam (re)conexão do socket e teardown, garantindo isolamento por usuário (eliminatório §11).
 */
import type { LoginRequest, RegisterRequest, Session } from "@/contracts";
import { getSession, login, logout, register } from "@/lib/http/api";
import { configureHttp } from "@/lib/http/client";
import { getToken } from "@/lib/http/token-store";
import { keys } from "@/lib/query/keys";
import { queryClient } from "@/lib/query/query-client";
import { connectRealtime, initRealtime, teardownUserData } from "@/lib/realtime";

/** Instala os efeitos colaterais da camada de dados. Chamado uma vez no bootstrap do app. */
export function initDataLayer(): void {
  // 401/sessão expirada (cenário `session-expired`, §6): o interceptor já limpou o token. Fazemos o
  // teardown COMPLETO — desconecta o socket (que ainda resolveria a identidade antiga server-side) e
  // limpa o cache privado (cart/favorites/profile/wallets/orders) — e então refletimos a sessão nula.
  // Sem isso, um login subsequente sem refresh herdaria dados do usuário anterior (eliminatório §11).
  configureHttp({
    onUnauthenticated: () => {
      teardownUserData();
      queryClient.setQueryData<Session | null>(keys.session, null);
    },
  });
  initRealtime(queryClient);
}

/** Revalida um token salvo no boot: busca a sessão e conecta o realtime se ela existir. */
export async function bootSession(): Promise<Session | null> {
  if (!getToken()) return null;
  const session = await queryClient.fetchQuery({
    queryKey: keys.session,
    queryFn: getSession,
  });
  if (session) connectRealtime(session.token);
  return session;
}

/**
 * Aplica uma sessão recém-emitida (login/registro). Faz teardown INCONDICIONAL antes de adotar: é
 * barato e idempotente, e garante isolamento mesmo quando a sessão anterior saiu por 401 (que zera o
 * cache de sessão para `null`, então uma checagem por `userId` cacheado pularia o teardown). §11.
 */
function adoptSession(session: Session): Session {
  teardownUserData();
  queryClient.setQueryData<Session | null>(keys.session, session);
  connectRealtime(session.token);
  return session;
}

export async function signIn(body: LoginRequest): Promise<Session> {
  return adoptSession(await login(body));
}

export async function signUp(body: RegisterRequest): Promise<Session> {
  return adoptSession(await register(body));
}

export async function signOut(): Promise<void> {
  // `api.logout` já limpa o token; o teardown desconecta o socket e zera o cache (inclui a sessão).
  await logout();
  teardownUserData();
  queryClient.setQueryData<Session | null>(keys.session, null);
}
