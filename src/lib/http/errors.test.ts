import { describe, expect, it } from "vitest";
import { AxiosError } from "axios";
import { isApiCode, toApiRequestError } from "./errors";

/** Monta um AxiosError com (ou sem) resposta HTTP, como o interceptor recebe. */
function axiosErrorWith(response?: { data: unknown; status: number }): AxiosError {
  return new AxiosError(
    "boom",
    "ERR",
    undefined,
    {},
    response ? ({ data: response.data, status: response.status } as never) : undefined,
  );
}

describe("toApiRequestError", () => {
  it("mapeia resposta com corpo ApiError para kind:'api'", () => {
    const body = { code: "conflict", message: "conflito", reason: "price_changed" };
    const detail = toApiRequestError(axiosErrorWith({ data: body, status: 409 }));
    expect(detail).toEqual({ kind: "api", status: 409, error: body });
  });

  it("trata corpo irreconhecível como transient genérico", () => {
    const detail = toApiRequestError(axiosErrorWith({ data: { foo: "bar" }, status: 500 }));
    expect(detail.kind).toBe("api");
    if (detail.kind === "api") {
      expect(detail.status).toBe(500);
      expect(detail.error.code).toBe("transient");
    }
  });

  it("sem resposta (queda de conexão) vira kind:'network'", () => {
    expect(toApiRequestError(axiosErrorWith())).toEqual({ kind: "network" });
  });

  it("erro não-Axios também cai em network (nunca mascara como sucesso)", () => {
    expect(toApiRequestError(new Error("qualquer"))).toEqual({ kind: "network" });
  });
});

describe("isApiCode", () => {
  it("discrimina pelo code de contrato", () => {
    const detail = toApiRequestError(
      axiosErrorWith({ data: { code: "unauthenticated", message: "x" }, status: 401 }),
    );
    expect(isApiCode(detail, "unauthenticated")).toBe(true);
    expect(isApiCode(detail, "conflict")).toBe(false);
    expect(isApiCode({ kind: "network" }, "unauthenticated")).toBe(false);
  });
});
