import { z } from "zod";
import { isoDateTimeSchema, nftIdSchema, versionSchema } from "./common";
import { ethAmountSchema, quantitySchema } from "./value-types";

/** Cotação (ver contracts.spec.md § Cotação). A cotação da API é a referência p/ finalizar (§3). */

export const quoteLineSchema = z.object({
  nftId: nftIdSchema,
  quantity: quantitySchema,
  unitPriceEth: ethAmountSchema,
  lineTotalEth: ethAmountSchema,
});

export const couponResultSchema = z.object({
  code: z.string(),
  valid: z.boolean(),
  reason: z.enum(["invalid", "expired"]).optional(),
});

export const quoteSchema = z.object({
  items: z.array(quoteLineSchema),
  subtotalEth: ethAmountSchema,
  discountEth: ethAmountSchema,
  networkFeeEth: ethAmountSchema,
  totalEth: ethAmountSchema,
  coupon: couponResultSchema.optional(),
  version: versionSchema, // casa com a versão do carrinho cotado
  quotedAt: isoDateTimeSchema,
});
export type Quote = z.infer<typeof quoteSchema>;

export const createQuoteRequestSchema = z.object({
  cartVersion: versionSchema,
  couponCode: z.string().optional(),
});
export type CreateQuoteRequest = z.infer<typeof createQuoteRequestSchema>;
