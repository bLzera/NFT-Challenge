import { z } from "zod";

/**
 * Convenções gerais (ver contracts.spec.md § Convenções gerais).
 * IDs de marca, datas ISO, version por recurso e envelope de paginação.
 */

/** ID opaco de marca. Cria um schema de string marcada por recurso. */
function brandedId<B extends string>() {
  return z.string().min(1).brand<B>();
}

export const nftIdSchema = brandedId<"NftId">();
export const userIdSchema = brandedId<"UserId">();
export const orderIdSchema = brandedId<"OrderId">();
export const walletIdSchema = brandedId<"WalletId">();

export type NftId = z.infer<typeof nftIdSchema>;
export type UserId = z.infer<typeof userIdSchema>;
export type OrderId = z.infer<typeof orderIdSchema>;
export type WalletId = z.infer<typeof walletIdSchema>;

/** Data/hora ISO-8601 em string. Sem `Date` no fio. */
export const isoDateTimeSchema = z.iso.datetime();
export type IsoDateTime = z.infer<typeof isoDateTimeSchema>;

/** Versão de recurso: inteiro não-negativo, incrementado a cada mutação. */
export const versionSchema = z.int().nonnegative();

/**
 * Parâmetros de paginação por página/offset (decisão aprovada #2). Coage strings pois os
 * search params da URL chegam sempre como string (§3: estado na URL, sobrevive a refresh).
 */
export const paginationParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationParams = z.infer<typeof paginationParamsSchema>;

/** Envelope de coleção paginada. */
export function paginatedSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.int().min(1),
    pageSize: z.int().min(1),
    total: z.int().nonnegative(),
    hasNext: z.boolean(),
  });
}
