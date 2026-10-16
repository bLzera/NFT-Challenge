import { describe, expect, it } from "vitest";
import { apiErrorSchema, ERROR_STATUS, isApiError } from "./errors";

describe("ApiError", () => {
  it("discrimina cada variante por code", () => {
    expect(isApiError({ code: "validation", message: "x", fields: { email: ["obrigatório"] } })).toBe(true);
    expect(isApiError({ code: "unauthenticated", message: "x" })).toBe(true);
    expect(isApiError({ code: "forbidden", message: "x" })).toBe(true);
    expect(isApiError({ code: "not_found", message: "x", resource: "nft" })).toBe(true);
    expect(isApiError({ code: "conflict", message: "x", reason: "idempotency_mismatch" })).toBe(true);
    expect(isApiError({ code: "transient", message: "x", retryable: true })).toBe(true);
  });

  it("rejeita corpos inválidos", () => {
    expect(isApiError({ code: "nope", message: "x" })).toBe(false);
    expect(isApiError({ code: "not_found", message: "x" })).toBe(false); // falta resource
    expect(isApiError({ code: "transient", message: "x", retryable: false })).toBe(false);
    expect(isApiError(null)).toBe(false);
    expect(isApiError("erro")).toBe(false);
  });

  it("aceita apenas reasons de conflito conhecidos", () => {
    expect(apiErrorSchema.safeParse({ code: "conflict", message: "x", reason: "coupon" }).success).toBe(true);
    expect(apiErrorSchema.safeParse({ code: "conflict", message: "x", reason: "wat" }).success).toBe(false);
  });

  it("mapeia code → status HTTP", () => {
    expect(ERROR_STATUS.validation).toBe(400);
    expect(ERROR_STATUS.unauthenticated).toBe(401);
    expect(ERROR_STATUS.forbidden).toBe(403);
    expect(ERROR_STATUS.not_found).toBe(404);
    expect(ERROR_STATUS.conflict).toBe(409);
    expect(ERROR_STATUS.transient).toBe(503);
  });
});
