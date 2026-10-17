import { HttpError, toApiRequestError, type ApiRequestError } from "@/lib/http/errors";

/**
 * Deriva o `ApiRequestError` normalizado de qualquer erro que chegue à UI (tipicamente o `HttpError`
 * rejeitado pela camada http, mas tolera um `ApiRequestError` já pronto ou um erro cru). Nunca
 * fabrica dado — apenas descreve a falha (eliminatório §11).
 */
export function resolveApiRequestError(error: unknown): ApiRequestError {
  if (error instanceof HttpError) return error.detail;
  if (isApiRequestError(error)) return error;
  return toApiRequestError(error);
}

function isApiRequestError(value: unknown): value is ApiRequestError {
  if (typeof value !== "object" || value === null) return false;
  const kind = (value as { kind?: unknown }).kind;
  return kind === "api" || kind === "network";
}

/** Mensagem amigável por tipo de falha. Erros de validação/conflito preferem a mensagem do contrato. */
export function errorMessage(detail: ApiRequestError): string {
  if (detail.kind === "network") {
    return "Falha de conexão. Verifique sua internet e tente de novo.";
  }
  switch (detail.error.code) {
    case "unauthenticated":
      return "Sua sessão expirou. Entre novamente para continuar.";
    case "forbidden":
      return "Você não tem permissão para acessar este conteúdo.";
    case "not_found":
      return "Não encontramos o que você procura.";
    case "transient":
      return "Falha temporária no serviço. Tente novamente.";
    case "validation":
    case "conflict":
      // Conteúdo específico (campos/`reason`) já vem na mensagem do contrato.
      return detail.error.message;
    default:
      return "Algo deu errado. Tente novamente.";
  }
}

/** Falhas que fazem sentido oferecer novo tentar imediato (rede ou transitório). */
export function isRetryable(detail: ApiRequestError): boolean {
  return detail.kind === "network" || detail.error.code === "transient";
}
