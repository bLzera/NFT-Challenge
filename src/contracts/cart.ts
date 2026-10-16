import { z } from "zod";
import { nftIdSchema, versionSchema } from "./common";
import { ethAmountSchema, quantitySchema, stockQuantitySchema } from "./value-types";

/** Carrinho (ver contracts.spec.md § Carrinho). */

export const cartItemSchema = z.object({
  nftId: nftIdSchema,
  title: z.string(),
  imageUrl: z.url(),
  unitPriceEth: ethAmountSchema,
  quantity: quantitySchema,
  availableEditions: stockQuantitySchema,
  version: versionSchema, // acompanha a versão do NFT de origem
});
export type CartItem = z.infer<typeof cartItemSchema>;

export const cartSchema = z.object({
  items: z.array(cartItemSchema),
  version: versionSchema,
});
export type Cart = z.infer<typeof cartSchema>;

export const addCartItemRequestSchema = z.object({
  nftId: nftIdSchema,
  quantity: quantitySchema,
});
export type AddCartItemRequest = z.infer<typeof addCartItemRequestSchema>;

export const updateCartItemRequestSchema = z.object({
  nftId: nftIdSchema,
  quantity: quantitySchema,
});
export type UpdateCartItemRequest = z.infer<typeof updateCartItemRequestSchema>;

export const removeCartItemRequestSchema = z.object({
  nftId: nftIdSchema,
});
export type RemoveCartItemRequest = z.infer<typeof removeCartItemRequestSchema>;
