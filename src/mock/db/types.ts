/**
 * Tipos internos do store (ver mock.spec.md § Store). Superconjunto dos contratos:
 * guardam campos PRIVADOS (hash de senha, tokens) que NUNCA vão ao fio.
 */
import type {
  Cart,
  EthAmount,
  Favorites,
  Nft,
  NftId,
  Order,
  OrderId,
  Profile,
  Quote,
  User,
  UserId,
  Wallet,
} from "@/contracts";

/** Registro de usuário: parte pública (User/Profile) + credencial fictícia. */
export interface UserRecord {
  user: User;
  profile: Profile;
  /** Hash fictício (`sha:<senha>`); nunca serializado em respostas. */
  passwordHash: string;
}

/** Token de sessão → usuário + expiração. */
export interface TokenRecord {
  userId: UserId;
  expiresAt: string;
}

/** Status de cupom nas fixtures; dirige o resultado inline da cotação. */
export type CouponStatus = "valid" | "invalid" | "expired";

export interface CouponRecord {
  code: string;
  status: CouponStatus;
  /** Percentual de desconto (0..1) aplicado ao subtotal quando `valid`. */
  rate: number;
}

/** Idempotência de pedido: mesma chave + mesmo hash → mesmo pedido. */
export interface IdempotencyRecord {
  requestHash: string;
  orderId: OrderId;
}

/** Cotação armazenada: a cotação em si + dono + a versão de carrinho cotada. */
export interface StoredQuote {
  quote: Quote;
  ownerKey: string;
  cartVersion: number;
}

/**
 * Chave de dono do carrinho: `UserId` para autenticado, `"guest"` para visitante.
 * Ao autenticar, o carrinho `guest` é mesclado no do usuário (decisão aprovada #5).
 */
export const GUEST_OWNER_KEY = "guest";

/** Estado completo em memória — fonte única compartilhada por REST e socket. */
export interface MockDb {
  users: Map<UserId, UserRecord>;
  /** email normalizado → UserId (detecção de cadastro duplicado). */
  emailIndex: Map<string, UserId>;
  tokens: Map<string, TokenRecord>;
  nfts: Map<NftId, Nft>;
  /** ordem de inserção do catálogo, p/ `sort=recent` estável. */
  nftOrder: NftId[];
  favorites: Map<UserId, Favorites>;
  carts: Map<string, Cart>;
  wallets: Map<UserId, Wallet[]>;
  quotes: Map<UserId, StoredQuote>;
  orders: Map<OrderId, Order>;
  /** pedido → dono (isolamento por usuário em eventos order.updated). */
  orderOwners: Map<OrderId, UserId>;
  idempotency: Map<string, IdempotencyRecord>;
  coupons: Map<string, CouponRecord>;
}

/** Taxa de rede fixa da simulação (ETH). */
export const NETWORK_FEE_ETH = "0.0025" as EthAmount;
