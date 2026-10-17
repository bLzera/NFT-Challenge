import { describe, expect, it } from "vitest";
import { HttpError, type ApiRequestError } from "@/lib/http/errors";
import { errorMessage, isRetryable, resolveApiRequestError } from "./error-message";

describe("resolveApiRequestError", () => {
  it("extrai o detail de um HttpError", () => {
    const detail: ApiRequestError = {
      kind: "api",
      status: 401,
      error: { code: "unauthenticated", message: "nope" },
    };
    expect(resolveApiRequestError(new HttpError(detail))).toEqual(detail);
  });

  it("aceita um ApiRequestError já normalizado", () => {
    const detail: ApiRequestError = { kind: "network" };
    expect(resolveApiRequestError(detail)).toBe(detail);
  });

  it("degrada erro desconhecido para `network` (não mascara como sucesso)", () => {
    expect(resolveApiRequestError(new Error("boom"))).toEqual({ kind: "network" });
    expect(resolveApiRequestError(undefined)).toEqual({ kind: "network" });
  });
});

describe("errorMessage", () => {
  it("usa mensagem por tipo para falha de rede", () => {
    expect(errorMessage({ kind: "network" })).toMatch(/conexão/i);
  });

  it("mapeia cada código de contrato para uma cópia amigável", () => {
    const cases: Array<[ApiRequestError, RegExp]> = [
      [{ kind: "api", status: 401, error: { code: "unauthenticated", message: "x" } }, /sessão/i],
      [{ kind: "api", status: 403, error: { code: "forbidden", message: "x" } }, /permissão/i],
      [
        { kind: "api", status: 404, error: { code: "not_found", message: "x", resource: "nft" } },
        /não encontramos/i,
      ],
      [
        { kind: "api", status: 503, error: { code: "transient", message: "x", retryable: true } },
        /temporária/i,
      ],
    ];
    for (const [detail, re] of cases) expect(errorMessage(detail)).toMatch(re);
  });

  it("prefere a mensagem do contrato em validation/conflict (campos/reason específicos)", () => {
    expect(
      errorMessage({
        kind: "api",
        status: 400,
        error: { code: "validation", message: "E-mail inválido", fields: { email: ["inválido"] } },
      }),
    ).toBe("E-mail inválido");
    expect(
      errorMessage({
        kind: "api",
        status: 409,
        error: { code: "conflict", message: "E-mail já cadastrado", reason: "registration" },
      }),
    ).toBe("E-mail já cadastrado");
  });
});

describe("isRetryable", () => {
  it("rede e transitório são retryable; o resto não", () => {
    expect(isRetryable({ kind: "network" })).toBe(true);
    expect(
      isRetryable({ kind: "api", status: 503, error: { code: "transient", message: "x", retryable: true } }),
    ).toBe(true);
    expect(
      isRetryable({ kind: "api", status: 401, error: { code: "unauthenticated", message: "x" } }),
    ).toBe(false);
  });
});
