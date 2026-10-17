import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Stub mínimo de Storage em cima de um Map (o ambiente de teste é node, sem localStorage). */
function installStorageStub(): Map<string, string> {
  const map = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: () => null,
    length: 0,
  } satisfies Storage);
  return map;
}

beforeEach(() => {
  vi.resetModules(); // zera o cache em memória do módulo entre os testes
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("token-store", () => {
  it("set/get/clear espelham no localStorage", async () => {
    const storage = installStorageStub();
    const { getToken, setToken, clearToken } = await import("./token-store");

    expect(getToken()).toBeNull();

    setToken("mock-token:u1:999");
    expect(getToken()).toBe("mock-token:u1:999");
    expect(storage.get("nft-auth:v1:token")).toBe("mock-token:u1:999");

    clearToken();
    expect(getToken()).toBeNull();
    expect(storage.has("nft-auth:v1:token")).toBe(false);
  });

  it("hidrata o token persistido no primeiro getToken (recuperação pós-refresh)", async () => {
    const storage = installStorageStub();
    storage.set("nft-auth:v1:token", "mock-token:u2:123");

    const { getToken } = await import("./token-store");
    expect(getToken()).toBe("mock-token:u2:123");
  });

  it("degrada para memória quando não há localStorage", async () => {
    vi.stubGlobal("localStorage", undefined);
    const { getToken, setToken } = await import("./token-store");
    setToken("mem-only");
    expect(getToken()).toBe("mem-only");
  });
});
