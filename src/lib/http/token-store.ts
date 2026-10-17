/**
 * Token de sessão do cliente (ver data.spec.md § lib/http · decisão #1).
 *
 * Fonte de leitura para o interceptor do Axios e o handshake do Socket.IO — ambos vivem fora do
 * ciclo de render do React, então o token mora aqui (memória), espelhado em `localStorage` para
 * sobreviver a refresh (recuperação de sessão pós-reload). O estado de sessão em si é derivado via
 * `GET /api/auth/session`; este módulo guarda apenas a credencial opaca.
 */

const STORAGE_KEY = "nft-auth:v1:token";

/** `localStorage` pode não existir (SSR/ambiente de teste node); acesso sempre defensivo. */
function safeStorage(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    // acesso a localStorage pode lançar (modo privado/políticas) — degrada p/ memória apenas.
    return null;
  }
}

let cached: string | null | undefined; // undefined = ainda não hidratado de localStorage

export function getToken(): string | null {
  if (cached === undefined) {
    cached = safeStorage()?.getItem(STORAGE_KEY) ?? null;
  }
  return cached;
}

export function setToken(token: string): void {
  cached = token;
  safeStorage()?.setItem(STORAGE_KEY, token);
}

export function clearToken(): void {
  cached = null;
  safeStorage()?.removeItem(STORAGE_KEY);
}
