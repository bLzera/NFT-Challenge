/**
 * Erro unificado da camada de dados (ver data.spec.md § lib/http · decisão #3).
 *
 * Toda falha de request — seja um erro de contrato (corpo `ApiError` 4xx/5xx) ou uma queda de
 * conexão (cenário de timeout/erro de rede, sem resposta) — é normalizada aqui para um shape único
 * e discriminado. A UI (Fase 4) consome `ApiRequestError` para decidir loading/vazio/erro/sucesso
 * sem reinspecionar o `AxiosError` cru. O cliente NUNCA fabrica dados (eliminatório §11): este tipo
 * só descreve a falha, não a disfarça de sucesso.
 */
import { AxiosError } from "axios";
import { apiErrorSchema, type ApiError } from "@/contracts";

export type ApiRequestError =
  | { kind: "api"; status: number; error: ApiError }
  | { kind: "network" };

/** Erro lançado/rejeitado pela camada http. Carrega o `ApiRequestError` normalizado. */
export class HttpError extends Error {
  readonly detail: ApiRequestError;

  constructor(detail: ApiRequestError) {
    super(detail.kind === "api" ? detail.error.message : "Falha de conexão");
    this.name = "HttpError";
    this.detail = detail;
  }
}

/** `transient` genérico: resposta sem corpo `ApiError` reconhecível (não vaza shape desconhecido). */
function genericTransient(status: number): ApiRequestError {
  return {
    kind: "api",
    status,
    error: { code: "transient", message: "Falha temporária.", retryable: true },
  };
}

/** Normaliza qualquer erro capturado numa request para `ApiRequestError`. */
export function toApiRequestError(e: unknown): ApiRequestError {
  if (e instanceof AxiosError) {
    // Sem `response` → não houve resposta HTTP: queda/timeout de conexão (cenário de rede).
    if (!e.response) return { kind: "network" };
    const parsed = apiErrorSchema.safeParse(e.response.data);
    if (parsed.success) return { kind: "api", status: e.response.status, error: parsed.data };
    return genericTransient(e.response.status);
  }
  // Erro inesperado (não-Axios) → trata como rede para não mascarar como sucesso.
  return { kind: "network" };
}

/** Discrimina um `ApiRequestError` por `code` de contrato sem repetir o shape. */
export function isApiCode(detail: ApiRequestError, code: ApiError["code"]): boolean {
  return detail.kind === "api" && detail.error.code === code;
}
