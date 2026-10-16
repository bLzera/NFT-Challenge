import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createOrderRequestSchema,
  createQuoteRequestSchema,
  nftIdSchema,
  type UserId,
} from "@/contracts";
import { store, type DomainEvent } from "./store";

/** Faz login no usuário semeado e devolve o UserId. */
function loginCollector(): UserId {
  const session = store.login({ email: "collector@example.com", password: "password123" });
  return session.user.id;
}

const NFT_A = nftIdSchema.parse("nft-001");

describe("store — fonte única da verdade (Fase 2)", () => {
  beforeEach(() => {
    store.setScenarioKey({ scenario: "default", seed: 1 });
    store.configure({ sessionTtlMs: 60 * 60 * 1000 });
    store.reset();
  });

  it("semeia catálogo e autentica usuário fixture", () => {
    const page = store.listNfts(createQueryList());
    expect(page.total).toBeGreaterThan(20);
    expect(page.items.length).toBe(20);
    expect(page.hasNext).toBe(true);
    const userId = loginCollector();
    expect(userId).toBe("user-collector");
  });

  it("filtra por disponibilidade e pagina", () => {
    const soldOut = store.listNfts({ ...createQueryList(), availability: "sold_out" });
    expect(soldOut.items.every((n) => n.editionsAvailable === 0)).toBe(true);
    const available = store.listNfts({ ...createQueryList(), availability: "available" });
    expect(available.items.every((n) => n.editionsAvailable > 0)).toBe(true);
  });

  it("incrementa version a cada mutação de favoritos", () => {
    const userId = loginCollector();
    const before = store.getFavorites(userId);
    const after = store.toggleFavorite(userId, NFT_A);
    expect(after.version).toBe(before.version + 1);
  });

  it("respeita disponibilidade no carrinho (conflict availability)", () => {
    const userId = loginCollector();
    const nft = store.getNft(NFT_A)!;
    const tooMany = (nft.editionsAvailable + 1) as never;
    expect(() => store.addCartItem(userId, { nftId: NFT_A, quantity: tooMany })).toThrowError();
  });

  it("idempotência: mesma chave recupera o mesmo pedido; conteúdo diferente gera 409", () => {
    const userId = loginCollector();
    store.addCartItem(userId, { nftId: NFT_A, quantity: 1 as never });
    const cart = store.getCart(userId);
    const quote = store.createQuote(
      userId,
      createQuoteRequestSchema.parse({ cartVersion: cart.version }),
    );
    const wallet = store.listWallets(userId)[0];
    const req = createOrderRequestSchema.parse({
      quoteVersion: quote.version,
      walletId: wallet.id,
      network: "ethereum",
      idempotencyKey: "key-1",
    });

    const first = store.createOrder(userId, req);
    expect(first.replayed).toBe(false);
    const replay = store.createOrder(userId, req);
    expect(replay.replayed).toBe(true);
    expect(replay.order.id).toBe(first.order.id);

    const conflicting = createOrderRequestSchema.parse({ ...req, network: "polygon" });
    expect(() => store.createOrder(userId, conflicting)).toThrowError();
  });

  it("resolveOrderLater confirma pedido, emite order.updated e esvazia o item comprado", () => {
    vi.useFakeTimers();
    try {
      const userId = loginCollector();
      store.addCartItem(userId, { nftId: NFT_A, quantity: 1 as never });
      const cart = store.getCart(userId);
      const quote = store.createQuote(
        userId,
        createQuoteRequestSchema.parse({ cartVersion: cart.version }),
      );
      const wallet = store.listWallets(userId)[0];
      const { order } = store.createOrder(
        userId,
        createOrderRequestSchema.parse({
          quoteVersion: quote.version,
          walletId: wallet.id,
          network: "ethereum",
          idempotencyKey: "key-confirm",
        }),
      );

      const events: DomainEvent[] = [];
      const unsub = store.subscribe((e) => events.push(e));
      store.resolveOrderLater(order.id, { status: "confirmed", delayMs: 100 });
      vi.advanceTimersByTime(100);
      unsub();

      const confirmed = store.getOrder(userId, order.id);
      expect(confirmed.status).toBe("confirmed");
      expect(confirmed.txRef).toBeTruthy();
      expect(events.some((e) => e.kind === "order.updated")).toBe(true);
      expect(store.getCart(userId).items.find((i) => i.nftId === NFT_A)).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("isolamento: outro usuário não acessa pedido alheio", () => {
    const ava = loginCollector();
    store.addCartItem(ava, { nftId: NFT_A, quantity: 1 as never });
    const cart = store.getCart(ava);
    const quote = store.createQuote(
      ava,
      createQuoteRequestSchema.parse({ cartVersion: cart.version }),
    );
    const wallet = store.listWallets(ava)[0];
    const { order } = store.createOrder(
      ava,
      createOrderRequestSchema.parse({
        quoteVersion: quote.version,
        walletId: wallet.id,
        network: "ethereum",
        idempotencyKey: "key-iso",
      }),
    );

    const beto = store.login({ email: "trader@example.com", password: "password123" }).user.id;
    expect(() => store.getOrder(beto, order.id)).toThrowError();
  });

  it("updateNft incrementa version e emite nft.updated", () => {
    const events: DomainEvent[] = [];
    const unsub = store.subscribe((e) => events.push(e));
    const before = store.getNft(NFT_A)!;
    const after = store.updateNft(NFT_A, { priceEth: before.priceEth });
    unsub();
    expect(after.version).toBe(before.version + 1);
    expect(events.some((e) => e.kind === "nft.updated")).toBe(true);
  });

  it("cupom válido aplica desconto; inválido vem inline sem desconto", () => {
    const userId = loginCollector();
    store.addCartItem(userId, { nftId: NFT_A, quantity: 1 as never });
    const cart = store.getCart(userId);
    const withCoupon = store.createQuote(
      userId,
      createQuoteRequestSchema.parse({ cartVersion: cart.version, couponCode: "WELCOME10" }),
    );
    expect(withCoupon.coupon?.valid).toBe(true);
    expect(Number(withCoupon.discountEth)).toBeGreaterThan(0);

    const bad = store.createQuote(
      userId,
      createQuoteRequestSchema.parse({ cartVersion: cart.version, couponCode: "NOPE" }),
    );
    expect(bad.coupon?.valid).toBe(false);
    expect(Number(bad.discountEth)).toBe(0);
  });
});

function createQueryList() {
  return { page: 1, pageSize: 20, sort: "recent" as const };
}
