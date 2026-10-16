/**
 * Semeadura determinística do store a partir das fixtures (ver mock.spec.md § Store).
 * Cada recurso é validado contra o schema da Fase 1 ao ser criado — as fixtures ficam
 * garantidamente em dia com os contratos. `version` começa em 0 e incrementa a cada mutação.
 */
import {
  cartSchema,
  favoritesSchema,
  nftIdSchema,
  nftSchema,
  profileSchema,
  userIdSchema,
  userSchema,
  walletSchema,
  type UserId,
} from "@/contracts";
import { COUPON_FIXTURES } from "../fixtures/coupons";
import { NFT_FIXTURES } from "../fixtures/nfts";
import { USER_FIXTURES } from "../fixtures/users";
import type { MockDb, UserRecord } from "./types";

/** Hash fictício de senha — jamais em claro no store (§3). */
export function hashPassword(password: string): string {
  return `sha:${password}`;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Constrói um `MockDb` zerado a partir das fixtures. O catálogo é estável; variações
 * determinísticas de cenário (latência/jitter) vivem em `scenarios/apply.ts`, semeadas por `seed`. */
export function buildDb(): MockDb {
  const db: MockDb = {
    users: new Map(),
    emailIndex: new Map(),
    tokens: new Map(),
    nfts: new Map(),
    nftOrder: [],
    favorites: new Map(),
    carts: new Map(),
    wallets: new Map(),
    quotes: new Map(),
    orders: new Map(),
    orderOwners: new Map(),
    idempotency: new Map(),
    coupons: new Map(),
  };

  for (const f of NFT_FIXTURES) {
    const nft = nftSchema.parse({ ...f, version: 0 });
    db.nfts.set(nft.id, nft);
    db.nftOrder.push(nft.id);
  }

  for (const f of USER_FIXTURES) {
    const id = userIdSchema.parse(f.id);
    const user = userSchema.parse({
      id: f.id,
      email: f.email,
      displayName: f.displayName,
      avatarUrl: f.avatarUrl,
      createdAt: f.createdAt,
    });
    const profile = profileSchema.parse({
      id: f.id,
      displayName: f.displayName,
      email: f.email,
      avatarUrl: f.avatarUrl,
      bio: f.bio,
      version: 0,
    });
    const record: UserRecord = { user, profile, passwordHash: hashPassword(f.password) };
    db.users.set(id, record);
    db.emailIndex.set(normalizeEmail(f.email), id);

    db.wallets.set(
      id,
      f.wallets.map((w) => walletSchema.parse({ ...w, version: 0 })),
    );

    const favoriteIds = f.favoriteNftIds
      .map((n) => nftIdSchema.parse(n))
      .filter((n) => db.nfts.has(n));
    db.favorites.set(id, favoritesSchema.parse({ nftIds: favoriteIds, version: 0 }));

    // Carrinho de usuário começa vazio; itens de visitante são mesclados ao autenticar.
    db.carts.set(id, cartSchema.parse({ items: [], version: 0 }));
  }

  for (const c of COUPON_FIXTURES) {
    db.coupons.set(c.code.toUpperCase(), c);
  }

  return db;
}

/** Converte string → UserId (helper de borda para handlers). */
export function toUserId(value: string): UserId {
  return userIdSchema.parse(value);
}
