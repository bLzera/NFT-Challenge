import { describe, expect, it } from "vitest";
import { HttpError, type ApiRequestError } from "@/lib/http/errors";
import { shouldRetry } from "./retry";

function apiError(code: string, status = 400): HttpError {
  const detail = {
    kind: "api",
    status,
    error: { code, message: "x", retryable: true, reason: "price_changed" },
  } as unknown as ApiRequestError;
  return new HttpError(detail);
}

const networkError = new HttpError({ kind: "network" });

describe("shouldRetry", () => {
  it("retenta queda de rede uma vez", () => {
    expect(shouldRetry(0, networkError)).toBe(true);
    expect(shouldRetry(1, networkError)).toBe(false);
  });

  it("retenta transient 5xx uma vez", () => {
    expect(shouldRetry(0, apiError("transient", 503))).toBe(true);
    expect(shouldRetry(1, apiError("transient", 503))).toBe(false);
  });

  it("não retenta um 4xx irreconhecível rotulado transient no fallback", () => {
    expect(shouldRetry(0, apiError("transient", 409))).toBe(false);
  });

  it("nunca retenta 4xx de contrato", () => {
    for (const code of ["validation", "unauthenticated", "forbidden", "not_found", "conflict"]) {
      expect(shouldRetry(0, apiError(code))).toBe(false);
    }
  });

  it("ignora erros que não são HttpError", () => {
    expect(shouldRetry(0, new Error("qualquer"))).toBe(false);
  });
});
