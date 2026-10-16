import { Decimal } from "decimal.js";
import { z } from "zod";

/**
 * Value types transversais (ver contracts.spec.md § Value types).
 *
 * ETH trafega SEMPRE como string decimal; nunca `number`/float em dinheiro.
 * Toda aritmética passa por decimal.js para manter precisão.
 */

/** Decimal finito e não-negativo? Seguro: não lança para entradas inválidas. */
function isNonNegativeDecimal(value: string): boolean {
  try {
    const d = new Decimal(value);
    return d.isFinite() && d.gte(0);
  } catch {
    return false;
  }
}

/** String decimal ETH, não-negativa e finita. Tipo de marca para evitar troca com string crua. */
export const ethAmountSchema = z
  .string()
  .refine(isNonNegativeDecimal, { message: "valor ETH inválido (decimal finito e não-negativo)" })
  .brand<"EthAmount">();

export type EthAmount = z.infer<typeof ethAmountSchema>;

/** Quantidade de item: inteiro ≥ 1 (itens de carrinho/pedido). */
export const quantitySchema = z.int().min(1).brand<"Quantity">();
export type Quantity = z.infer<typeof quantitySchema>;

/**
 * Quantidade de estoque: inteiro ≥ 0 (pode esgotar). Mesmo conceito `Quantity`, marcado,
 * para `editionsAvailable`/`availableEditions` e payloads de evento (ver spec § Value types).
 */
export const stockQuantitySchema = z.int().min(0).brand<"Quantity">();
export type StockQuantity = z.infer<typeof stockQuantitySchema>;

/** Converte uma string/número para EthAmount validado (lança se inválido). */
export function parseEth(value: string | number): EthAmount {
  return ethAmountSchema.parse(typeof value === "number" ? String(value) : value);
}

/** Converte um inteiro para Quantity validado. */
export function parseQuantity(value: number): Quantity {
  return quantitySchema.parse(value);
}

/** Formata um EthAmount para exibição, sem perder precisão no cálculo. */
export function formatEth(
  value: EthAmount | string,
  opts: { maxFractionDigits?: number } = {},
): string {
  const { maxFractionDigits = 4 } = opts;
  return new Decimal(value).toDecimalPlaces(maxFractionDigits, Decimal.ROUND_DOWN).toString();
}

export function addEth(a: EthAmount | string, b: EthAmount | string): EthAmount {
  return new Decimal(a).plus(new Decimal(b)).toString() as EthAmount;
}

export function subEth(a: EthAmount | string, b: EthAmount | string): EthAmount {
  return new Decimal(a).minus(new Decimal(b)).toString() as EthAmount;
}

/** Multiplica um valor ETH por uma quantidade inteira (preço de linha). */
export function mulEth(amount: EthAmount | string, qty: Quantity | number): EthAmount {
  return new Decimal(amount).times(qty).toString() as EthAmount;
}

export function eqEth(a: EthAmount | string, b: EthAmount | string): boolean {
  return new Decimal(a).eq(new Decimal(b));
}

export function gteEth(a: EthAmount | string, b: EthAmount | string): boolean {
  return new Decimal(a).gte(new Decimal(b));
}
