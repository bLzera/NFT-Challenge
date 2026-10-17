/**
 * Instância Axios da aplicação (ver data.spec.md § lib/http).
 *
 * `baseURL = /api` casa com a base dos handlers MSW (Fase 2). Dois interceptors:
 *  - request: injeta `Authorization: Bearer <token>` quando há sessão.
 *  - response: normaliza toda falha para `HttpError`/`ApiRequestError`; em `unauthenticated` (401)
 *    limpa o token e avisa quem orquestra a sessão (decisão #2: sem refresh — o mock não expõe esse
 *    endpoint). Nunca converte falha em sucesso fictício (eliminatório §11).
 */
import axios from "axios";
import { clearToken, getToken } from "./token-store";
import { HttpError, isApiCode, toApiRequestError } from "./errors";

/** Base REST — casa com `_helpers.API` do mock. */
export const API_BASE = "/api";

/**
 * Timeout alto de propósito: a latência é roteiro dos cenários (Fase 2), não acidente. O cliente só
 * precisa capturar a QUEDA de conexão (`HttpResponse.error()`), que o Axios reporta sem `response`.
 */
const REQUEST_TIMEOUT_MS = 30_000;

export const http = axios.create({
  baseURL: API_BASE,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { "Content-Type": "application/json" },
});

/** Callback registrado pela orquestração de sessão p/ reagir a 401 (invalidar sessão, etc). */
let onUnauthenticated: (() => void) | null = null;

export function configureHttp(opts: { onUnauthenticated?: () => void }): void {
  onUnauthenticated = opts.onUnauthenticated ?? null;
}

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const detail = toApiRequestError(error);
    if (isApiCode(detail, "unauthenticated")) {
      clearToken();
      onUnauthenticated?.();
    }
    return Promise.reject(new HttpError(detail));
  },
);
