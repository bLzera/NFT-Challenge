import { describe, expect, it } from "vitest";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { HttpError, type ApiRequestError } from "@/lib/http/errors";
import { applyFieldErrors } from "./apply-field-errors";
import { KNOWN_NETWORKS, availableNetworks } from "./wallets/wallet-schemas";

/* ── availableNetworks (A-wallets-2) ─────────────────────────────────────── */

describe("availableNetworks", () => {
  it("retorna o conjunto conhecido do mock quando não há carteiras", () => {
    expect(availableNetworks([])).toEqual([...KNOWN_NETWORKS]);
  });

  it("une redes existentes sem duplicar as conhecidas", () => {
    expect(availableNetworks(["ethereum"])).toEqual(["ethereum", "polygon"]);
  });

  it("preserva uma rede legada fora do conjunto conhecido", () => {
    expect(availableNetworks(["arbitrum"])).toEqual(["ethereum", "polygon", "arbitrum"]);
  });
});

/* ── applyFieldErrors (A4) ───────────────────────────────────────────────── */

function makeSetError() {
  const calls: Array<{ field: string; message: string }> = [];
  const setError = ((field: Path<FieldValues>, err: { message?: string }) => {
    calls.push({ field: field as string, message: err.message ?? "" });
  }) as unknown as UseFormSetError<FieldValues>;
  return { setError, calls };
}

function httpApi(detail: ApiRequestError): HttpError {
  return new HttpError(detail);
}

describe("applyFieldErrors", () => {
  it("distribui erros de validação por campo conhecido", () => {
    const { setError, calls } = makeSetError();
    const err = httpApi({
      kind: "api",
      status: 400,
      error: {
        code: "validation",
        message: "Dados inválidos",
        fields: { displayName: ["Muito curto"], bio: ["Inválido"] },
      },
    });

    applyFieldErrors(err, { setError, knownFields: ["displayName", "bio"] });

    expect(calls).toEqual([
      { field: "displayName", message: "Muito curto" },
      { field: "bio", message: "Inválido" },
    ]);
  });

  it("joga validação de campo desconhecido para root", () => {
    const { setError, calls } = makeSetError();
    const err = httpApi({
      kind: "api",
      status: 400,
      error: { code: "validation", message: "Falhou", fields: { outro: ["x"] } },
    });

    applyFieldErrors(err, { setError, knownFields: ["displayName"] });

    expect(calls).toEqual([{ field: "root", message: "Falhou" }]);
  });

  it("usa mapKnown para 'senha atual incorreta' → campo current", () => {
    const { setError, calls } = makeSetError();
    const err = httpApi({
      kind: "api",
      status: 400,
      error: { code: "validation", message: "x", fields: { current: [""] } },
    });

    applyFieldErrors(err, {
      setError,
      knownFields: ["current", "next"],
      mapKnown: (detail) =>
        detail.kind === "api" && detail.error.code === "validation" && "current" in detail.error.fields
          ? { field: "current", message: "Senha atual incorreta." }
          : undefined,
    });

    expect(calls).toEqual([{ field: "current", message: "Senha atual incorreta." }]);
  });

  it("erro de rede vai para root com mensagem de conexão", () => {
    const { setError, calls } = makeSetError();
    applyFieldErrors(httpApi({ kind: "network" }), { setError, knownFields: [] });
    expect(calls).toHaveLength(1);
    expect(calls[0].field).toBe("root");
    expect(calls[0].message).toMatch(/conectar/i);
  });

  it("transient vai para root com mensagem temporária", () => {
    const { setError, calls } = makeSetError();
    const err = httpApi({
      kind: "api",
      status: 503,
      error: { code: "transient", message: "x", retryable: true },
    });
    applyFieldErrors(err, { setError, knownFields: [] });
    expect(calls[0]).toEqual({ field: "root", message: expect.stringMatching(/temporária/i) });
  });

  it("erro não-HttpError cai em mensagem genérica no root (nunca fabrica dado)", () => {
    const { setError, calls } = makeSetError();
    applyFieldErrors(new Error("boom"), { setError, knownFields: [] });
    expect(calls).toEqual([{ field: "root", message: "Algo deu errado. Tente novamente." }]);
  });
});
