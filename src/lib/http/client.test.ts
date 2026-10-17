import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError, type AxiosAdapter } from "axios";

// Token store dublado: queremos observar clearToken e controlar getToken.
vi.mock("./token-store", () => ({
  getToken: vi.fn(),
  setToken: vi.fn(),
  clearToken: vi.fn(),
}));

import { getToken, clearToken } from "./token-store";
import { configureHttp, http } from "./client";
import { HttpError } from "./errors";

/** Instala um adapter que captura a config e devolve/lança a resposta programada. */
function stubAdapter(impl: AxiosAdapter): void {
  http.defaults.adapter = impl;
}

beforeEach(() => {
  vi.clearAllMocks();
  configureHttp({});
});

afterEach(() => {
  http.defaults.adapter = undefined;
});

describe("request interceptor", () => {
  it("injeta Authorization quando há token", async () => {
    vi.mocked(getToken).mockReturnValue("mock-token:u1:999");
    let seen: string | undefined;
    stubAdapter(async (config) => {
      seen = config.headers?.get?.("Authorization") as string | undefined;
      return { data: {}, status: 200, statusText: "OK", headers: {}, config };
    });

    await http.get("/anything");
    expect(seen).toBe("Bearer mock-token:u1:999");
  });

  it("não injeta Authorization sem token", async () => {
    vi.mocked(getToken).mockReturnValue(null);
    let seen: unknown;
    stubAdapter(async (config) => {
      seen = config.headers?.get?.("Authorization");
      return { data: {}, status: 200, statusText: "OK", headers: {}, config };
    });

    await http.get("/anything");
    expect(seen).toBeFalsy();
  });
});

describe("response interceptor", () => {
  it("em 401 limpa o token, avisa onUnauthenticated e rejeita com HttpError", async () => {
    const onUnauthenticated = vi.fn();
    configureHttp({ onUnauthenticated });
    vi.mocked(getToken).mockReturnValue("mock-token:u1:999");

    stubAdapter(async (config) => {
      throw new AxiosError(
        "unauth",
        "ERR",
        config,
        config,
        { data: { code: "unauthenticated", message: "expirou" }, status: 401 } as never,
      );
    });

    await expect(http.get("/protegido")).rejects.toBeInstanceOf(HttpError);
    expect(clearToken).toHaveBeenCalledTimes(1);
    expect(onUnauthenticated).toHaveBeenCalledTimes(1);
  });

  it("em erro não-401 rejeita com HttpError sem limpar o token", async () => {
    vi.mocked(getToken).mockReturnValue("mock-token:u1:999");
    stubAdapter(async (config) => {
      throw new AxiosError(
        "conflict",
        "ERR",
        config,
        config,
        { data: { code: "conflict", message: "x", reason: "price_changed" }, status: 409 } as never,
      );
    });

    await expect(http.get("/x")).rejects.toMatchObject({ detail: { kind: "api", status: 409 } });
    expect(clearToken).not.toHaveBeenCalled();
  });
});
