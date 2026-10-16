import { z } from "zod";

/**
 * Modelo de erros (ver contracts.spec.md § Modelo de erros).
 * União discriminada por `code`, reusável por mock, http e UI.
 * Latência/timeout/indisponibilidade de conexão são comportamento de transporte
 * (cenários MSW, Fase 2), não variantes de corpo.
 */

export const conflictReasonSchema = z.enum([
  "availability",
  "idempotency_mismatch",
  "coupon",
  "price_changed",
  "registration",
]);
export type ConflictReason = z.infer<typeof conflictReasonSchema>;

export const validationErrorSchema = z.object({
  code: z.literal("validation"),
  message: z.string(),
  fields: z.record(z.string(), z.array(z.string())),
});

export const unauthenticatedErrorSchema = z.object({
  code: z.literal("unauthenticated"),
  message: z.string(),
});

export const forbiddenErrorSchema = z.object({
  code: z.literal("forbidden"),
  message: z.string(),
});

export const notFoundErrorSchema = z.object({
  code: z.literal("not_found"),
  message: z.string(),
  resource: z.string(),
});

export const conflictErrorSchema = z.object({
  code: z.literal("conflict"),
  message: z.string(),
  reason: conflictReasonSchema,
});

export const transientErrorSchema = z.object({
  code: z.literal("transient"),
  message: z.string(),
  retryable: z.literal(true),
});

export const apiErrorSchema = z.discriminatedUnion("code", [
  validationErrorSchema,
  unauthenticatedErrorSchema,
  forbiddenErrorSchema,
  notFoundErrorSchema,
  conflictErrorSchema,
  transientErrorSchema,
]);

export type ApiError = z.infer<typeof apiErrorSchema>;

/** HTTP status mapeado por code (usado por mock e tratamento no cliente). */
export const ERROR_STATUS: Record<ApiError["code"], number> = {
  validation: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  transient: 503,
};

/** Type guard: corpo desconhecido é um ApiError? */
export function isApiError(value: unknown): value is ApiError {
  return apiErrorSchema.safeParse(value).success;
}
