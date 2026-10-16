/**
 * Fonte única da verdade da camada de mock (ver mock.spec.md § Store).
 *
 * Um único estado em memória (`MockDb`) é lido e mutado tanto pelos handlers REST quanto pelo
 * servidor-socket. Toda mutação relevante incrementa a `version` do recurso e publica um
 * domain-event interno — é assim que uma mudança via REST se reflete num evento Socket.IO (§6)
 * e vice-versa. Persistência em `localStorage` sobrevive a refresh; `reset()` restaura o cenário.
 */
import { Decimal } from "decimal.js";
import {
  addEth,
  eqEth,
  gteEth,
  mulEth,
  subEth,
  type AddCartItemRequest,
  type ApiError,
  type Cart,
  type CartItem,
  type CreateOrderRequest,
  type CreateQuoteRequest,
  type EthAmount,
  type Favorites,
  type ListNftsQuery,
  type LoginRequest,
  type Nft,
  type NftId,
  type NftPage,
  type Order,
  type OrderId,
  type OrderStatus,
  type Profile,
  type Quantity,
  type Quote,
  type RegisterRequest,
  type Session,
  type StockQuantity,
  type UpdateCartItemRequest,
  type User,
  type UserId,
  type Wallet,
  type WalletId,
} from "@/contracts";
import type { MockState } from "@/mock/scenario";
import { buildDb, hashPassword, normalizeEmail } from "./db/seed";
import { GUEST_OWNER_KEY, NETWORK_FEE_ETH, type MockDb } from "./db/types";
import { errors } from "./http-error";

/** Evento de domínio publicado a cada mutação; o servidor-socket o traduz em evento Socket.IO. */
export type DomainEvent =
  | { kind: "nft.updated"; nft: Nft }
  | { kind: "order.updated"; order: Order; userId: UserId };

type DomainListener = (event: DomainEvent) => void;

/** Parâmetros ajustáveis por cenário (evita acoplar o store à engine de cenários). */
export interface StoreConfig {
  /** TTL de sessão em ms. Cenário `session-expired` encurta p/ expirar durante a navegação. */
  sessionTtlMs: number;
}

const DEFAULT_CONFIG: StoreConfig = { sessionTtlMs: 60 * 60 * 1000 };
const PERSIST_PREFIX = "nft-mock:v1";

function persistKey(state: { scenario: string; seed: number }): string {
  return `${PERSIST_PREFIX}:${state.scenario}:${state.seed}`;
}

function hasLocalStorage(): boolean {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}

function cmpEth(a: EthAmount, b: EthAmount): number {
  return new Decimal(a).comparedTo(new Decimal(b));
}

class Store {
  private db: MockDb = buildDb();
  private orderSeq = 0;
  private config: StoreConfig = { ...DEFAULT_CONFIG };
  private keyParts = { scenario: "default", seed: 1 };
  private listeners = new Set<DomainListener>();
  private resetListeners = new Set<() => void>();
  private timers = new Set<ReturnType<typeof setTimeout>>();

  // ---- Ciclo de vida -------------------------------------------------------

  /** Carrega estado persistido do cenário/seed; se ausente ou inválido, semeia do zero. */
  hydrate(state: MockState): void {
    this.keyParts = { scenario: state.scenario, seed: state.seed };
    this.clearTimers();
    if (hasLocalStorage()) {
      const raw = localStorage.getItem(persistKey(this.keyParts));
      if (raw) {
        try {
          this.db = deserialize(raw);
          this.orderSeq = readOrderSeq(raw);
          return;
        } catch {
          // fallback: estado corrompido → re-semeia
        }
      }
    }
    this.db = buildDb();
    this.orderSeq = 0;
    this.save();
  }

  /** Aponta o store para um cenário/seed (chave de persistência) sem recarregar — usado antes de `reset`. */
  setScenarioKey(state: MockState): void {
    this.keyParts = { scenario: state.scenario, seed: state.seed };
  }

  /** Restaura integralmente o cenário conhecido (§6): re-semeia e persiste. */
  reset(): void {
    this.clearTimers();
    this.db = buildDb();
    this.orderSeq = 0;
    this.save();
    for (const l of this.resetListeners) l();
  }

  /** Notifica no `reset()`/troca de cenário (o servidor-socket força re-handshake das conexões). */
  onReset(listener: () => void): () => void {
    this.resetListeners.add(listener);
    return () => this.resetListeners.delete(listener);
  }

  configure(patch: Partial<StoreConfig>): void {
    this.config = { ...this.config, ...patch };
  }

  private save(): void {
    if (!hasLocalStorage()) return;
    try {
      localStorage.setItem(persistKey(this.keyParts), serialize(this.db, this.orderSeq));
    } catch {
      // cota cheia / indisponível → segue só em memória
    }
  }

  private clearTimers(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
  }

  // ---- Domain events -------------------------------------------------------

  subscribe(listener: DomainListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: DomainEvent): void {
    for (const l of this.listeners) l(event);
  }

  // ---- Sessão e conta ------------------------------------------------------

  register(req: RegisterRequest): Session {
    const email = normalizeEmail(req.email);
    if (this.db.emailIndex.has(email)) {
      throw errors.conflict("registration", "E-mail já cadastrado.");
    }
    // id opaco (sem PII do e-mail); o `emailIndex` resolve o lookup por e-mail.
    const id = `user-acct-${this.db.users.size + 1}` as UserId;
    const createdAt = new Date().toISOString();
    const user: User = { id, email: req.email, displayName: req.displayName, createdAt };
    const profile: Profile = {
      id,
      displayName: req.displayName,
      email: req.email,
      version: 0,
    };
    this.db.users.set(id, { user, profile, passwordHash: hashPassword(req.password) });
    this.db.emailIndex.set(email, id);
    this.db.wallets.set(id, []);
    this.db.favorites.set(id, { nftIds: [], version: 0 });
    this.db.carts.set(id, { items: [], version: 0 });
    this.save();
    return this.issueSession(id);
  }

  login(req: LoginRequest): Session {
    const id = this.db.emailIndex.get(normalizeEmail(req.email));
    const record = id ? this.db.users.get(id) : undefined;
    if (!record || record.passwordHash !== hashPassword(req.password)) {
      throw errors.unauthenticated("E-mail ou senha inválidos.");
    }
    return this.issueSession(record.user.id);
  }

  private issueSession(userId: UserId): Session {
    const expMs = Date.now() + this.config.sessionTtlMs;
    const expiresAt = new Date(expMs).toISOString();
    const token = `mock-token:${userId}:${Math.floor(expMs / 1000)}`;
    this.db.tokens.set(token, { userId, expiresAt });
    this.save();
    const record = this.db.users.get(userId)!;
    return { user: record.user, token, expiresAt };
  }

  /** Resolve o usuário a partir do token do header; null se ausente/expirado. */
  resolveUser(token: string | null): UserId | null {
    if (!token) return null;
    const rec = this.db.tokens.get(token);
    if (!rec) return null;
    if (new Date(rec.expiresAt).getTime() <= Date.now()) {
      this.db.tokens.delete(token);
      this.save();
      return null;
    }
    return rec.userId;
  }

  getSession(token: string | null): Session | null {
    const userId = this.resolveUser(token);
    if (!userId || !token) return null;
    const rec = this.db.tokens.get(token)!;
    const record = this.db.users.get(userId)!;
    return { user: record.user, token, expiresAt: rec.expiresAt };
  }

  logout(token: string | null): void {
    if (token) this.db.tokens.delete(token);
    this.save();
  }

  // ---- NFTs ----------------------------------------------------------------

  listNfts(query: ListNftsQuery): NftPage {
    let items = this.db.nftOrder.map((id) => this.db.nfts.get(id)!);

    if (query.q) {
      const q = query.q.toLowerCase();
      items = items.filter((n) =>
        [n.title, n.collection, n.creator].some((f) => f.toLowerCase().includes(q)),
      );
    }
    if (query.collection) {
      items = items.filter((n) => n.collection === query.collection);
    }
    if (query.minPriceEth) {
      items = items.filter((n) => gteEth(n.priceEth, query.minPriceEth!));
    }
    if (query.maxPriceEth) {
      items = items.filter((n) => gteEth(query.maxPriceEth!, n.priceEth));
    }
    if (query.availability === "available") {
      items = items.filter((n) => n.editionsAvailable > 0);
    } else if (query.availability === "sold_out") {
      items = items.filter((n) => n.editionsAvailable === 0);
    }

    switch (query.sort) {
      case "price_asc":
        items = [...items].sort((a, b) => cmpEth(a.priceEth, b.priceEth));
        break;
      case "price_desc":
        items = [...items].sort((a, b) => cmpEth(b.priceEth, a.priceEth));
        break;
      case "popular":
        items = [...items].sort(
          (a, b) => b.editionsTotal - b.editionsAvailable - (a.editionsTotal - a.editionsAvailable),
        );
        break;
      case "recent":
      default:
        items = [...items].reverse();
        break;
    }

    const total = items.length;
    const start = (query.page - 1) * query.pageSize;
    const paged = items.slice(start, start + query.pageSize);
    return {
      items: paged,
      page: query.page,
      pageSize: query.pageSize,
      total,
      hasNext: start + query.pageSize < total,
    };
  }

  /** Primeiro NFT presente em algum carrinho (alvo do cenário `price-changed`, ciente do carrinho). */
  firstCartNftId(): NftId | null {
    for (const cart of this.db.carts.values()) {
      if (cart.items.length) return cart.items[0].nftId;
    }
    return null;
  }

  getNft(idOrSlug: string): Nft | undefined {
    const byId = this.db.nfts.get(idOrSlug as NftId);
    if (byId) return byId;
    for (const nft of this.db.nfts.values()) {
      if (nft.slug === idOrSlug) return nft;
    }
    return undefined;
  }

  /** Muta preço/disponibilidade de um NFT, incrementa versão e emite `nft.updated`. */
  updateNft(id: NftId, patch: { priceEth?: EthAmount; editionsAvailable?: StockQuantity }): Nft {
    const current = this.db.nfts.get(id);
    if (!current) throw errors.notFound("nft");
    const next: Nft = {
      ...current,
      ...(patch.priceEth !== undefined ? { priceEth: patch.priceEth } : {}),
      ...(patch.editionsAvailable !== undefined
        ? { editionsAvailable: patch.editionsAvailable }
        : {}),
      version: (current.version + 1) as Nft["version"],
    };
    this.db.nfts.set(id, next);
    this.save();
    this.emit({ kind: "nft.updated", nft: next });
    return next;
  }

  // ---- Favoritos -----------------------------------------------------------

  getFavorites(userId: UserId): Favorites {
    return this.db.favorites.get(userId) ?? { nftIds: [], version: 0 };
  }

  toggleFavorite(userId: UserId, nftId: NftId): Favorites {
    if (!this.db.nfts.has(nftId)) throw errors.notFound("nft");
    const current = this.getFavorites(userId);
    const has = current.nftIds.includes(nftId);
    const nftIds = has
      ? current.nftIds.filter((id) => id !== nftId)
      : [...current.nftIds, nftId];
    const next: Favorites = { nftIds, version: current.version + 1 };
    this.db.favorites.set(userId, next);
    this.save();
    return next;
  }

  // ---- Carrinho ------------------------------------------------------------

  getCart(ownerKey: string): Cart {
    return this.db.carts.get(ownerKey) ?? { items: [], version: 0 };
  }

  private writeCart(ownerKey: string, items: CartItem[], prevVersion: number): Cart {
    const next: Cart = { items, version: prevVersion + 1 };
    this.db.carts.set(ownerKey, next);
    this.save();
    return next;
  }

  addCartItem(ownerKey: string, req: AddCartItemRequest): Cart {
    const nft = this.db.nfts.get(req.nftId);
    if (!nft) throw errors.notFound("nft");
    const cart = this.getCart(ownerKey);
    const existing = cart.items.find((i) => i.nftId === req.nftId);
    const desired = (existing ? existing.quantity + req.quantity : req.quantity) as Quantity;
    if (desired > nft.editionsAvailable) {
      throw errors.conflict("availability", "Quantidade acima das edições disponíveis.");
    }
    const line = this.lineFor(nft, desired);
    const items = existing
      ? cart.items.map((i) => (i.nftId === req.nftId ? line : i))
      : [...cart.items, line];
    return this.writeCart(ownerKey, items, cart.version);
  }

  updateCartItem(ownerKey: string, req: UpdateCartItemRequest): Cart {
    const nft = this.db.nfts.get(req.nftId);
    if (!nft) throw errors.notFound("nft");
    const cart = this.getCart(ownerKey);
    if (!cart.items.some((i) => i.nftId === req.nftId)) throw errors.notFound("cart_item");
    if (req.quantity > nft.editionsAvailable) {
      throw errors.conflict("availability", "Quantidade acima das edições disponíveis.");
    }
    const items = cart.items.map((i) => (i.nftId === req.nftId ? this.lineFor(nft, req.quantity) : i));
    return this.writeCart(ownerKey, items, cart.version);
  }

  removeCartItem(ownerKey: string, nftId: NftId): Cart {
    const cart = this.getCart(ownerKey);
    const items = cart.items.filter((i) => i.nftId !== nftId);
    return this.writeCart(ownerKey, items, cart.version);
  }

  /** Mescla o carrinho de visitante no do usuário ao autenticar (decisão #5). */
  mergeGuestCartInto(userId: UserId): Cart {
    const guest = this.getCart(GUEST_OWNER_KEY);
    let cart = this.getCart(userId);
    for (const g of guest.items) {
      const nft = this.db.nfts.get(g.nftId);
      if (!nft) continue;
      const existing = cart.items.find((i) => i.nftId === g.nftId);
      const merged = Math.min(
        (existing ? existing.quantity + g.quantity : g.quantity),
        nft.editionsAvailable,
      );
      if (merged < 1) continue;
      const line = this.lineFor(nft, merged as Quantity);
      const items = existing
        ? cart.items.map((i) => (i.nftId === g.nftId ? line : i))
        : [...cart.items, line];
      cart = { items, version: cart.version + 1 };
    }
    this.db.carts.set(userId, cart);
    this.db.carts.set(GUEST_OWNER_KEY, { items: [], version: guest.version + 1 });
    this.save();
    return cart;
  }

  private lineFor(nft: Nft, quantity: Quantity): CartItem {
    return {
      nftId: nft.id,
      title: nft.title,
      imageUrl: nft.imageUrl,
      unitPriceEth: nft.priceEth,
      quantity,
      availableEditions: nft.editionsAvailable,
      version: nft.version,
    };
  }

  // ---- Cotação -------------------------------------------------------------

  createQuote(userId: UserId, req: CreateQuoteRequest): Quote {
    const cart = this.getCart(userId);
    if (cart.version !== req.cartVersion) {
      throw errors.conflict("price_changed", "O carrinho mudou; refaça a cotação.");
    }
    const lines = cart.items.map((i) => {
      const nft = this.db.nfts.get(i.nftId);
      const unit = nft ? nft.priceEth : i.unitPriceEth;
      return {
        nftId: i.nftId,
        quantity: i.quantity,
        unitPriceEth: unit,
        lineTotalEth: mulEth(unit, i.quantity),
      };
    });
    const subtotalEth = lines.reduce<EthAmount>(
      (acc, l) => addEth(acc, l.lineTotalEth),
      "0" as EthAmount,
    );

    let discountEth = "0" as EthAmount;
    let coupon: Quote["coupon"];
    if (req.couponCode) {
      const rec = this.db.coupons.get(req.couponCode.toUpperCase());
      if (rec && rec.status === "valid") {
        discountEth = mulEth(subtotalEth, rec.rate);
        coupon = { code: req.couponCode, valid: true };
      } else {
        coupon = {
          code: req.couponCode,
          valid: false,
          reason: rec?.status === "expired" ? "expired" : "invalid",
        };
      }
    }

    const totalEth = addEth(subEth(subtotalEth, discountEth), NETWORK_FEE_ETH);
    const quote: Quote = {
      items: lines,
      subtotalEth,
      discountEth,
      networkFeeEth: NETWORK_FEE_ETH,
      totalEth,
      coupon,
      version: cart.version,
      quotedAt: new Date().toISOString(),
    };
    this.db.quotes.set(userId, { quote, ownerKey: userId, cartVersion: cart.version });
    this.save();
    return quote;
  }

  // ---- Pedidos -------------------------------------------------------------

  createOrder(userId: UserId, req: CreateOrderRequest): { order: Order; replayed: boolean } {
    const requestHash = JSON.stringify({
      quoteVersion: req.quoteVersion,
      walletId: req.walletId,
      network: req.network,
    });
    const prior = this.db.idempotency.get(req.idempotencyKey);
    if (prior) {
      if (prior.requestHash !== requestHash) {
        throw errors.conflict("idempotency_mismatch", "Chave de idempotência reutilizada.");
      }
      const existing = this.db.orders.get(prior.orderId);
      if (existing) return { order: existing, replayed: true };
    }

    const stored = this.db.quotes.get(userId);
    if (!stored || stored.quote.version !== req.quoteVersion) {
      throw errors.conflict("price_changed", "Cotação desatualizada; revise e confirme novamente.");
    }
    const quote = stored.quote;

    const wallet = (this.db.wallets.get(userId) ?? []).find((w) => w.id === req.walletId);
    if (!wallet) throw errors.notFound("wallet");

    // Revalida preço e disponibilidade contra o catálogo atual (§7 checkout).
    for (const line of quote.items) {
      const nft = this.db.nfts.get(line.nftId);
      if (!nft) throw errors.notFound("nft");
      if (!eqEth(nft.priceEth, line.unitPriceEth)) {
        throw errors.conflict("price_changed", "Preço alterado desde a cotação.");
      }
      if (nft.editionsAvailable < line.quantity) {
        throw errors.conflict("availability", "Edição esgotada durante a compra.");
      }
    }

    const id = `order-${String(++this.orderSeq).padStart(4, "0")}` as OrderId;
    const order: Order = {
      id,
      status: "pending",
      items: quote.items.map((l) => ({
        nftId: l.nftId,
        title: this.db.nfts.get(l.nftId)!.title,
        imageUrl: this.db.nfts.get(l.nftId)!.imageUrl,
        unitPriceEth: l.unitPriceEth,
        quantity: l.quantity,
        lineTotalEth: l.lineTotalEth,
      })),
      subtotalEth: quote.subtotalEth,
      discountEth: quote.discountEth,
      networkFeeEth: quote.networkFeeEth,
      totalEth: quote.totalEth,
      wallet: { address: wallet.address, network: req.network },
      createdAt: new Date().toISOString(),
      version: 0,
    };
    this.db.orders.set(id, order);
    this.db.orderOwners.set(id, userId);
    this.db.idempotency.set(req.idempotencyKey, { requestHash, orderId: id });
    this.save();
    return { order, replayed: false };
  }

  getOrder(userId: UserId, orderId: OrderId): Order {
    const order = this.db.orders.get(orderId);
    // isolamento: não revela pedidos de outro usuário (§11)
    if (!order || this.db.orderOwners.get(orderId) !== userId) throw errors.notFound("order");
    return order;
  }

  /**
   * Agenda a transição terminal do pedido (ciclo de vida → `order.updated`). Em `confirmed`,
   * reduz o estoque dos NFTs (emitindo `nft.updated`) e remove do carrinho os itens comprados.
   */
  resolveOrderLater(
    orderId: OrderId,
    opts: { status: Extract<OrderStatus, "confirmed" | "declined">; delayMs: number; txRef?: string },
  ): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      const order = this.db.orders.get(orderId);
      const userId = this.db.orderOwners.get(orderId);
      if (!order || !userId || order.status !== "pending") return;

      const next: Order = {
        ...order,
        status: opts.status,
        txRef: opts.status === "confirmed" ? (opts.txRef ?? `0xtx${orderId}`) : undefined,
        version: order.version + 1,
      };
      this.db.orders.set(orderId, next);

      if (opts.status === "confirmed") {
        this.reduceStockFor(next);
        this.removePurchasedFromCart(userId, next);
      }
      this.save();
      this.emit({ kind: "order.updated", order: next, userId });
    }, Math.max(0, opts.delayMs));
    this.timers.add(timer);
  }

  private reduceStockFor(order: Order): void {
    for (const item of order.items) {
      const nft = this.db.nfts.get(item.nftId);
      if (!nft) continue;
      const remaining = Math.max(0, nft.editionsAvailable - item.quantity) as StockQuantity;
      this.updateNft(item.nftId, { editionsAvailable: remaining });
    }
  }

  private removePurchasedFromCart(userId: UserId, order: Order): void {
    const cart = this.getCart(userId);
    const items: CartItem[] = [];
    for (const i of cart.items) {
      const bought = order.items.find((o) => o.nftId === i.nftId);
      if (!bought) {
        items.push(i);
        continue;
      }
      const remaining = i.quantity - bought.quantity;
      if (remaining > 0) items.push({ ...i, quantity: remaining as Quantity });
    }
    this.db.carts.set(userId, { items, version: cart.version + 1 });
  }

  // ---- Perfil e carteiras --------------------------------------------------

  getProfile(userId: UserId): Profile {
    return this.db.users.get(userId)!.profile;
  }

  updateProfile(userId: UserId, patch: Partial<Pick<Profile, "displayName" | "bio" | "avatarUrl">>): Profile {
    const record = this.db.users.get(userId)!;
    const next: Profile = { ...record.profile, ...patch, version: record.profile.version + 1 };
    record.profile = next;
    // mantém o User público coerente com o perfil
    record.user = {
      ...record.user,
      displayName: next.displayName,
      ...(next.avatarUrl !== undefined ? { avatarUrl: next.avatarUrl } : {}),
    };
    this.save();
    return next;
  }

  changePassword(userId: UserId, current: string, next: string): void {
    const record = this.db.users.get(userId)!;
    if (record.passwordHash !== hashPassword(current)) {
      throw errors.validation({ current: ["Senha atual incorreta."] });
    }
    record.passwordHash = hashPassword(next);
    this.save();
  }

  listWallets(userId: UserId): Wallet[] {
    return this.db.wallets.get(userId) ?? [];
  }

  createWallet(userId: UserId, data: Omit<Wallet, "id" | "version">): Wallet {
    const list = this.db.wallets.get(userId) ?? [];
    if (data.role === "primary" && list.some((w) => w.role === "primary")) {
      throw errors.validation({ role: ["Já existe uma carteira principal."] });
    }
    const id = `wallet-${userId}-${list.length + 1}` as WalletId;
    const wallet: Wallet = { ...data, id, version: 0 };
    this.db.wallets.set(userId, [...list, wallet]);
    this.save();
    return wallet;
  }

  updateWallet(userId: UserId, walletId: WalletId, patch: Partial<Omit<Wallet, "id" | "version">>): Wallet {
    const list = this.db.wallets.get(userId) ?? [];
    const idx = list.findIndex((w) => w.id === walletId);
    if (idx === -1) throw errors.notFound("wallet");
    if (
      patch.role === "primary" &&
      list.some((w) => w.id !== walletId && w.role === "primary")
    ) {
      throw errors.validation({ role: ["Já existe uma carteira principal."] });
    }
    const next: Wallet = { ...list[idx], ...patch, version: list[idx].version + 1 };
    const updated = [...list];
    updated[idx] = next;
    this.db.wallets.set(userId, updated);
    this.save();
    return next;
  }
}

// ---- (De)serialização de persistência --------------------------------------

interface Serialized {
  users: [UserId, MockDb["users"] extends Map<UserId, infer V> ? V : never][];
  emailIndex: [string, UserId][];
  tokens: [string, { userId: UserId; expiresAt: string }][];
  nfts: [NftId, Nft][];
  nftOrder: NftId[];
  favorites: [UserId, Favorites][];
  carts: [string, Cart][];
  wallets: [UserId, Wallet[]][];
  quotes: [UserId, MockDb["quotes"] extends Map<UserId, infer V> ? V : never][];
  orders: [OrderId, Order][];
  orderOwners: [OrderId, UserId][];
  idempotency: [string, { requestHash: string; orderId: OrderId }][];
  coupons: [string, MockDb["coupons"] extends Map<string, infer V> ? V : never][];
  orderSeq: number;
}

function serialize(db: MockDb, orderSeq: number): string {
  const payload: Serialized = {
    users: [...db.users],
    emailIndex: [...db.emailIndex],
    tokens: [...db.tokens],
    nfts: [...db.nfts],
    nftOrder: db.nftOrder,
    favorites: [...db.favorites],
    carts: [...db.carts],
    wallets: [...db.wallets],
    quotes: [...db.quotes],
    orders: [...db.orders],
    orderOwners: [...db.orderOwners],
    idempotency: [...db.idempotency],
    coupons: [...db.coupons],
    orderSeq,
  };
  return JSON.stringify(payload);
}

function deserialize(raw: string): MockDb {
  const p = JSON.parse(raw) as Serialized;
  return {
    users: new Map(p.users),
    emailIndex: new Map(p.emailIndex),
    tokens: new Map(p.tokens),
    nfts: new Map(p.nfts),
    nftOrder: p.nftOrder,
    favorites: new Map(p.favorites),
    carts: new Map(p.carts),
    wallets: new Map(p.wallets),
    quotes: new Map(p.quotes),
    orders: new Map(p.orders),
    orderOwners: new Map(p.orderOwners),
    idempotency: new Map(p.idempotency),
    coupons: new Map(p.coupons),
  };
}

function readOrderSeq(raw: string): number {
  return (JSON.parse(raw) as Serialized).orderSeq ?? 0;
}

/** Singleton do store — importado por handlers REST e servidor-socket. */
export const store = new Store();

/** Reexport p/ handlers construírem corpos de erro tipados sem reimportar. */
export type { ApiError };
