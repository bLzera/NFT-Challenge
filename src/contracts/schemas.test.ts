import { describe, expect, it } from "vitest";
import { listNftsQuerySchema, nftSchema } from "./nft";
import { orderSchema } from "./order";
import { sessionResponseSchema, userSchema } from "./session";
import { nftUpdatedEventSchema, orderUpdatedEventSchema, socketEventSchemaUnion } from "./events";

const nft = {
  id: "nft_1",
  title: "Cosmic Ape",
  slug: "cosmic-ape",
  description: "desc",
  imageUrl: "https://cdn.example/a.png",
  collection: "Apes",
  creator: "0xabc",
  priceEth: "1.25",
  editionsTotal: 10,
  editionsAvailable: 3,
  attributes: [{ trait: "bg", value: "blue" }],
  version: 2,
};

describe("recursos REST", () => {
  it("valida um NFT completo", () => {
    expect(nftSchema.safeParse(nft).success).toBe(true);
  });

  it("rejeita NFT com preço float negativo", () => {
    expect(nftSchema.safeParse({ ...nft, priceEth: "-1" }).success).toBe(false);
  });

  it("aplica defaults de paginação e sort em listNfts", () => {
    const parsed = listNftsQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(20);
    expect(parsed.sort).toBe("recent");
  });

  it("coage page/pageSize vindos da URL como string (§3)", () => {
    const parsed = listNftsQuerySchema.parse({ page: "3", pageSize: "50", sort: "price_asc" });
    expect(parsed.page).toBe(3);
    expect(parsed.pageSize).toBe(50);
  });

  it("User público não vaza senha", () => {
    const parsed = userSchema.parse({
      id: "u1",
      email: "a@b.com",
      displayName: "A",
      createdAt: "2026-10-16T00:00:00.000Z",
    });
    expect("password" in parsed).toBe(false);
  });

  it("getSession aceita null (sem sessão)", () => {
    expect(sessionResponseSchema.safeParse(null).success).toBe(true);
  });

  it("Order com status terminal e snapshot de itens", () => {
    const order = {
      id: "ord_1",
      status: "confirmed",
      items: [
        { nftId: "nft_1", title: "Cosmic Ape", imageUrl: "https://cdn.example/a.png", unitPriceEth: "1.25", quantity: 2, lineTotalEth: "2.5" },
      ],
      subtotalEth: "2.5",
      discountEth: "0",
      networkFeeEth: "0.01",
      totalEth: "2.51",
      wallet: { address: "0xabc", network: "ethereum" },
      txRef: "0xdeadbeef",
      createdAt: "2026-10-16T00:00:00.000Z",
      version: 1,
    };
    expect(orderSchema.safeParse(order).success).toBe(true);
  });
});

describe("eventos socket", () => {
  const nftEvt = {
    id: "evt_1",
    type: "nft.updated",
    resource: { type: "nft", id: "nft_1" },
    version: 3,
    at: "2026-10-16T00:00:00.000Z",
    payload: { priceEth: "1.30", editionsAvailable: 2 },
  };

  it("valida nft.updated e order.updated", () => {
    expect(nftUpdatedEventSchema.safeParse(nftEvt).success).toBe(true);
    expect(
      orderUpdatedEventSchema.safeParse({
        id: "evt_2",
        type: "order.updated",
        resource: { type: "order", id: "ord_1" },
        version: 1,
        at: "2026-10-16T00:00:00.000Z",
        payload: { status: "confirmed", txRef: "0xabc" },
      }).success,
    ).toBe(true);
  });

  it("discrimina a união por type", () => {
    const parsed = socketEventSchemaUnion.parse(nftEvt);
    expect(parsed.type).toBe("nft.updated");
  });

  it("rejeita evento sem version", () => {
    const noVersion: Record<string, unknown> = { ...nftEvt };
    delete noVersion.version;
    expect(nftUpdatedEventSchema.safeParse(noVersion).success).toBe(false);
  });

  it("rejeita nft.updated com payload vazio (deve carregar recurso afetado, §7)", () => {
    expect(nftUpdatedEventSchema.safeParse({ ...nftEvt, payload: {} }).success).toBe(false);
  });
});
