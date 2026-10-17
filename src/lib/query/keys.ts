/**
 * Query-key factory tipada (ver data.spec.md § lib/query · keys.ts).
 *
 * Fonte única das chaves de cache — hooks de leitura, invalidação por eventos socket e reconciliação
 * importam daqui, nunca montam arrays à mão. Chaves hierárquicas (`["nft","list", …]`) permitem
 * invalidar um recurso inteiro ou uma entrada específica. `normalized` garante que a mesma consulta
 * — independente da ordem com que os filtros chegam da URL (Fase 4) — gere a MESMA chave.
 */
import type { ListNftsQuery } from "@/contracts";

/** Serializa a consulta de catálogo de forma estável (ordem de chaves fixa, sem `undefined`). */
export function normalizeNftQuery(query: Partial<ListNftsQuery>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(query).sort()) {
    const value = (query as Record<string, unknown>)[key];
    if (value !== undefined && value !== "") out[key] = value;
  }
  return out;
}

export const keys = {
  session: ["session"] as const,

  nft: {
    all: ["nft"] as const,
    lists: () => ["nft", "list"] as const,
    list: (query: Partial<ListNftsQuery>) => ["nft", "list", normalizeNftQuery(query)] as const,
    detail: (idOrSlug: string) => ["nft", "detail", idOrSlug] as const,
  },

  favorites: ["favorites"] as const,
  cart: ["cart"] as const,

  quote: (cartVersion: number, couponCode?: string) =>
    ["quote", cartVersion, couponCode ?? null] as const,

  order: {
    all: ["order"] as const,
    detail: (orderId: string) => ["order", "detail", orderId] as const,
  },

  profile: ["profile"] as const,
  wallets: ["wallets"] as const,
} as const;
