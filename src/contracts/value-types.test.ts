import { describe, expect, it } from "vitest";
import {
  addEth,
  eqEth,
  ethAmountSchema,
  formatEth,
  gteEth,
  mulEth,
  parseEth,
  parseQuantity,
  quantitySchema,
  subEth,
} from "./value-types";

describe("EthAmount", () => {
  it("aceita strings decimais não-negativas", () => {
    expect(ethAmountSchema.safeParse("0").success).toBe(true);
    expect(ethAmountSchema.safeParse("1.5").success).toBe(true);
    expect(ethAmountSchema.safeParse("0.000000000000000001").success).toBe(true);
  });

  it("rejeita negativos, não-finitos e lixo", () => {
    expect(ethAmountSchema.safeParse("-1").success).toBe(false);
    expect(ethAmountSchema.safeParse("abc").success).toBe(false);
    expect(ethAmountSchema.safeParse("Infinity").success).toBe(false);
    expect(ethAmountSchema.safeParse("NaN").success).toBe(false);
  });

  it("mantém precisão sem float (0.1 + 0.2 = 0.3)", () => {
    expect(eqEth(addEth(parseEth("0.1"), parseEth("0.2")), "0.3")).toBe(true);
  });

  it("compara 1.50 e 1.5 como iguais", () => {
    expect(eqEth("1.50", "1.5")).toBe(true);
  });

  it("subtrai e multiplica por quantidade", () => {
    expect(eqEth(subEth("1.0", "0.25"), "0.75")).toBe(true);
    expect(eqEth(mulEth(parseEth("0.3"), parseQuantity(3)), "0.9")).toBe(true);
  });

  it("gte funciona com precisão", () => {
    expect(gteEth("0.3", "0.30")).toBe(true);
    expect(gteEth("0.2", "0.3")).toBe(false);
  });

  it("formata truncando casas (ROUND_DOWN), sem arredondar pra cima", () => {
    expect(formatEth(parseEth("1.23456789"), { maxFractionDigits: 4 })).toBe("1.2345");
    expect(formatEth(parseEth("2"), { maxFractionDigits: 2 })).toBe("2");
  });
});

describe("Quantity", () => {
  it("aceita inteiros >= 1", () => {
    expect(quantitySchema.safeParse(1).success).toBe(true);
    expect(quantitySchema.safeParse(99).success).toBe(true);
  });

  it("rejeita zero, negativos e não-inteiros", () => {
    expect(quantitySchema.safeParse(0).success).toBe(false);
    expect(quantitySchema.safeParse(-1).success).toBe(false);
    expect(quantitySchema.safeParse(1.5).success).toBe(false);
  });
});
