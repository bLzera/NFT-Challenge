import { z } from "zod";
import { nftIdSchema, paginatedSchema, paginationParamsSchema, versionSchema } from "./common";
import { ethAmountSchema, quantitySchema, stockQuantitySchema } from "./value-types";

/** NFTs (ver contracts.spec.md § NFTs). */

export const nftAttributeSchema = z.object({
  trait: z.string(),
  value: z.string(),
});

export const nftSchema = z.object({
  id: nftIdSchema,
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string(),
  imageUrl: z.url(),
  collection: z.string(),
  creator: z.string(),
  priceEth: ethAmountSchema,
  editionsTotal: quantitySchema,
  editionsAvailable: stockQuantitySchema, // pode zerar (esgotado)
  attributes: z.array(nftAttributeSchema),
  version: versionSchema,
});
export type Nft = z.infer<typeof nftSchema>;

/** Ordenação serializável na URL (§3). */
export const nftSortSchema = z.enum(["price_asc", "price_desc", "recent", "popular"]);
export type NftSort = z.infer<typeof nftSortSchema>;

export const nftAvailabilitySchema = z.enum(["all", "available", "sold_out"]);

/** Filtros combináveis, serializáveis na URL; mudança reinicia paginação (regra de UI). */
export const nftFiltersSchema = z.object({
  collection: z.string().optional(),
  minPriceEth: ethAmountSchema.optional(),
  maxPriceEth: ethAmountSchema.optional(),
  availability: nftAvailabilitySchema.optional(),
});
export type NftFilters = z.infer<typeof nftFiltersSchema>;

export const listNftsQuerySchema = paginationParamsSchema.extend({
  q: z.string().optional(),
  sort: nftSortSchema.default("recent"),
  ...nftFiltersSchema.shape,
});
export type ListNftsQuery = z.infer<typeof listNftsQuerySchema>;

export const nftPageSchema = paginatedSchema(nftSchema);
export type NftPage = z.infer<typeof nftPageSchema>;

/** Parâmetro de rota do detalhe: aceita id ou slug (acesso direto, §3). */
export const getNftParamsSchema = z.object({ idOrSlug: z.string().min(1) });
export type GetNftParams = z.infer<typeof getNftParamsSchema>;
