/**
 * Política de retry das queries (ver data.spec.md § lib/query · retry.ts · decisão #4).
 *
 * Erros de contrato 4xx (`validation`/`unauthenticated`/`forbidden`/`not_found`/`conflict`) são
 * determinísticos: retentar não muda o resultado e só mascara o cenário de falha (eliminatório §11).
 * Já `transient` (503) e queda de rede são transitórios por definição → 1 retry. Mutations não
 * retentam (a idempotência de pedido é feita pelo `idempotencyKey`, não por retry cego).
 */
import { HttpError } from "@/lib/http/errors";

const MAX_TRANSIENT_RETRIES = 1;

export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_TRANSIENT_RETRIES) return false;
  if (!(error instanceof HttpError)) return false;

  const { detail } = error;
  if (detail.kind === "network") return true;
  if (detail.kind !== "api") return false; // invariante local, resistente a um futuro 3º kind
  // Só retenta `transient` de fato servidor (5xx). Um corpo irreconhecível em 4xx cai no fallback
  // `transient` de `toApiRequestError`, mas não deve ser retentado (é determinístico).
  return detail.error.code === "transient" && detail.status >= 500;
}
