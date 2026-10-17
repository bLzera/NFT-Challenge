import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderId } from "@/contracts";

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

const STORAGE_KEY = "nft-checkout:v1:pending-order";
const ORDER_ID = "order-0001" as OrderId;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("pending-order-storage (A9)", () => {
  it("write/read/clear espelham o orderId no localStorage", async () => {
    const storage = installStorageStub();
    const { readPendingOrderId, writePendingOrderId, clearPendingOrderId } = await import(
      "./pending-order-storage"
    );

    // Vazio inicialmente — nada a recuperar.
    expect(readPendingOrderId()).toBeUndefined();

    writePendingOrderId(ORDER_ID);
    expect(readPendingOrderId()).toBe(ORDER_ID);
    // Persiste APENAS o id (A9: nunca dados do pedido).
    expect(storage.get(STORAGE_KEY)).toBe(ORDER_ID);

    clearPendingOrderId();
    expect(readPendingOrderId()).toBeUndefined();
    expect(storage.has(STORAGE_KEY)).toBe(false);
  });

  it("recupera o orderId persistido num novo ciclo (refresh/reconexão)", async () => {
    const storage = installStorageStub();
    storage.set(STORAGE_KEY, ORDER_ID);

    const { readPendingOrderId } = await import("./pending-order-storage");
    expect(readPendingOrderId()).toBe(ORDER_ID);
  });

  it("degrada graciosamente quando o localStorage lança (ex.: modo privado)", async () => {
    // getItem/setItem/removeItem lançam — a UI não pode quebrar; a tentativa em memória segue.
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
      clear: () => {},
      key: () => null,
      length: 0,
    } satisfies Storage);

    const { readPendingOrderId, writePendingOrderId, clearPendingOrderId } = await import(
      "./pending-order-storage"
    );

    expect(readPendingOrderId()).toBeUndefined();
    expect(() => writePendingOrderId(ORDER_ID)).not.toThrow();
    expect(() => clearPendingOrderId()).not.toThrow();
  });

  it("read retorna undefined quando não há localStorage no ambiente", async () => {
    vi.stubGlobal("localStorage", undefined);
    const { readPendingOrderId } = await import("./pending-order-storage");
    expect(readPendingOrderId()).toBeUndefined();
  });
});
