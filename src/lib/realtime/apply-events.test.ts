import { beforeEach, describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import type { Cart, Nft, NftPage, Order } from "@/contracts";
import { keys } from "@/lib/query/keys";
import { clearVersions, onNftUpdated, onOrderUpdated } from "./apply-events";

/** Envelope `nft.updated` completo (ver contracts/events). */
function nftEvent(version: number, payload: { priceEth?: string; editionsAvailable?: number }) {
  return {
    id: `evt-${version}`,
    type: "nft.updated",
    resource: { type: "nft", id: "nft-001" },
    version,
    at: "2026-10-17T12:00:00.000Z",
    payload,
  };
}

function orderEvent(version: number, status: "confirmed" | "declined", txRef?: string) {
  return {
    id: `evt-o-${version}`,
    type: "order.updated",
    resource: { type: "order", id: "order-1" },
    version,
    at: "2026-10-17T12:00:00.000Z",
    payload: { status, ...(txRef ? { txRef } : {}) },
  };
}

function seedNft(qc: QueryClient) {
  qc.setQueryData<Nft>(keys.nft.detail("nft-001"), {
    id: "nft-001",
    title: "Demo",
    slug: "demo",
    description: "",
    imageUrl: "https://x/i.png",
    collection: "c",
    creator: "k",
    priceEth: "1.0",
    editionsTotal: 10,
    editionsAvailable: 5,
    attributes: [],
    version: 1,
  } as unknown as Nft);
}

let qc: QueryClient;

beforeEach(() => {
  clearVersions();
  qc = new QueryClient();
});

describe("onNftUpdated", () => {
  it("aplica preço e edições no detalhe em cache", () => {
    seedNft(qc);
    onNftUpdated(qc, nftEvent(2, { priceEth: "1.25", editionsAvailable: 4 }));

    const nft = qc.getQueryData<Nft>(keys.nft.detail("nft-001"))!;
    expect(nft.priceEth).toBe("1.25");
    expect(nft.editionsAvailable).toBe(4);
    expect(nft.version).toBe(2);
  });

  it("descarta evento com version menor ou igual à última aplicada (dedupe/fora de ordem)", () => {
    seedNft(qc);
    onNftUpdated(qc, nftEvent(3, { priceEth: "3.0" }));
    onNftUpdated(qc, nftEvent(2, { priceEth: "2.0" })); // mais antigo → ignorado
    onNftUpdated(qc, nftEvent(3, { priceEth: "9.9" })); // duplicado → ignorado

    expect(qc.getQueryData<Nft>(keys.nft.detail("nft-001"))!.priceEth).toBe("3.0");
  });

  it("aplica no detalhe cacheado por slug (não só por id)", () => {
    // O detalhe aceita id OU slug como chave; o patch casa pelo `data.id`, não pela chave.
    qc.setQueryData<Nft>(keys.nft.detail("demo"), {
      id: "nft-001",
      slug: "demo",
      priceEth: "1.0",
      editionsAvailable: 5,
      version: 1,
    } as unknown as Nft);

    onNftUpdated(qc, nftEvent(2, { priceEth: "2.5" }));
    const nft = qc.getQueryData<Nft>(keys.nft.detail("demo"))!;
    expect(nft.priceEth).toBe("2.5");
    expect(nft.version).toBe(2);
  });

  it("reflete no item de página de catálogo em cache", () => {
    qc.setQueryData<NftPage>(keys.nft.list({}), {
      items: [{ id: "nft-001", priceEth: "1.0", editionsAvailable: 5, version: 1 } as unknown as Nft],
      page: 1,
      pageSize: 20,
      total: 1,
      hasNext: false,
    } as unknown as NftPage);

    onNftUpdated(qc, nftEvent(2, { priceEth: "1.5" }));
    const page = qc.getQueryData<NftPage>(keys.nft.list({}))!;
    expect(page.items[0].priceEth).toBe("1.5");
    expect(page.items[0].version).toBe(2);
  });

  it("reflete preço/disponibilidade no carrinho (§7)", () => {
    qc.setQueryData<Cart>(keys.cart, {
      items: [
        { nftId: "nft-001", unitPriceEth: "1.0", availableEditions: 5, version: 1 } as unknown as Cart["items"][number],
      ],
      version: 1,
    } as unknown as Cart);

    onNftUpdated(qc, nftEvent(2, { priceEth: "1.5", editionsAvailable: 0 }));
    const cart = qc.getQueryData<Cart>(keys.cart)!;
    expect(cart.items[0].unitPriceEth).toBe("1.5");
    expect(cart.items[0].availableEditions).toBe(0);
    expect(cart.items[0].version).toBe(2);
  });
});

describe("onOrderUpdated", () => {
  it("escreve status/txRef/version no recibo em cache", () => {
    qc.setQueryData<Order>(keys.order.detail("order-1"), {
      id: "order-1",
      status: "pending",
      version: 1,
    } as unknown as Order);

    onOrderUpdated(qc, orderEvent(2, "confirmed", "0xabc"));
    const order = qc.getQueryData<Order>(keys.order.detail("order-1"))!;
    expect(order.status).toBe("confirmed");
    expect(order.txRef).toBe("0xabc");
    expect(order.version).toBe(2);
  });

  it("não cria pedido se ele não está em cache", () => {
    onOrderUpdated(qc, orderEvent(2, "confirmed"));
    expect(qc.getQueryData(keys.order.detail("order-1"))).toBeUndefined();
  });
});
