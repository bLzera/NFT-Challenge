import { z } from "zod";
import { isoDateTimeSchema, nftIdSchema, orderIdSchema, versionSchema, walletIdSchema } from "./common";
import { ethAmountSchema, quantitySchema } from "./value-types";

/** Pedidos (ver contracts.spec.md § Pedidos). Criação idempotente; recibo é snapshot imutável. */

export const orderStatusSchema = z.enum(["pending", "confirmed", "declined"]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

/** Item do pedido: snapshot imutável do momento da compra (não muda com o catálogo depois). */
export const orderItemSchema = z.object({
  nftId: nftIdSchema,
  title: z.string(),
  imageUrl: z.url(),
  unitPriceEth: ethAmountSchema,
  quantity: quantitySchema,
  lineTotalEth: ethAmountSchema,
});
export type OrderItem = z.infer<typeof orderItemSchema>;

export const orderWalletSchema = z.object({
  address: z.string(),
  network: z.string(),
});

export const orderSchema = z.object({
  id: orderIdSchema,
  status: orderStatusSchema,
  items: z.array(orderItemSchema),
  subtotalEth: ethAmountSchema,
  discountEth: ethAmountSchema,
  networkFeeEth: ethAmountSchema,
  totalEth: ethAmountSchema,
  wallet: orderWalletSchema,
  txRef: z.string().optional(), // referência de transação simulada
  createdAt: isoDateTimeSchema,
  version: versionSchema,
});
export type Order = z.infer<typeof orderSchema>;

/** Parâmetro de rota da consulta de pedido (estado/recibo, recuperação pós-refresh). */
export const getOrderParamsSchema = z.object({ orderId: orderIdSchema });
export type GetOrderParams = z.infer<typeof getOrderParamsSchema>;

export const createOrderRequestSchema = z.object({
  quoteVersion: versionSchema,
  walletId: walletIdSchema,
  network: z.string(),
  /** Chave de idempotência: mesma chave recupera o mesmo pedido (§5). */
  idempotencyKey: z.string().min(1),
});
export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>;
