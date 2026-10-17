import { describe, expect, it } from "vitest";
import { formatOrderDate, formatTxRef, formatWallet, tokenIdSuffix, truncateAddress } from "./receipt-format";

describe("receipt-format", () => {
  describe("truncateAddress", () => {
    it("trunca endereços longos no estilo 0x…", () => {
      expect(truncateAddress("0xA91F1234567890abcdefE82C")).toBe("0xA91F…E82C");
    });
    it("mantém endereços curtos intactos (<= 12 chars)", () => {
      expect(truncateAddress("0x12345678")).toBe("0x12345678");
    });
  });

  describe("formatTxRef", () => {
    it("retorna '—' quando ausente (pedido ainda não terminal, nunca fabrica)", () => {
      expect(formatTxRef(undefined)).toBe("—");
      expect(formatTxRef("")).toBe("—");
    });
    it("trunca o txRef presente", () => {
      expect(formatTxRef("0xdeadbeef1234567890cafebabe")).toBe("0xdead…babe");
    });
  });

  describe("formatWallet", () => {
    it("exibe rede · endereço truncado — nunca um label fabricado (A3)", () => {
      expect(formatWallet({ network: "ethereum", address: "0xA91F1234567890abcdefE82C" })).toBe(
        "ethereum · 0xA91F…E82C",
      );
    });
  });

  describe("formatOrderDate", () => {
    it("formata uma data ISO válida em pt-BR", () => {
      // Checa que produz algo estável (ano presente), sem acoplar ao locale exato do runner.
      const out = formatOrderDate("2026-10-17T12:00:00.000Z");
      expect(out).toContain("2026");
      expect(out).not.toBe("Invalid Date");
    });
    it("faz fallback para a string original quando a data é corrompida (B5)", () => {
      expect(formatOrderDate("não-é-data")).toBe("não-é-data");
    });
  });

  describe("tokenIdSuffix", () => {
    it("remove o prefixo nft- (nft-001 → 001)", () => {
      expect(tokenIdSuffix("nft-001")).toBe("001");
    });
    it("mantém ids sem o prefixo", () => {
      expect(tokenIdSuffix("001")).toBe("001");
    });
  });
});
