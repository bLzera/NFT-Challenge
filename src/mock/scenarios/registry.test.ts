import { describe, expect, it } from "vitest";
import { SCENARIOS } from "./registry";

/** Cenários determinísticos exigidos pelo README §6 (e listados na mock.spec.md). */
const REQUIRED = [
  "default",
  "empty",
  "slow",
  "jitter",
  "offline",
  "http-4xx",
  "http-5xx",
  "session-expired",
  "unauthorized",
  "register-conflict",
  "coupon-invalid",
  "coupon-expired",
  "price-changed",
  "sold-out-during-purchase",
  "order-timeout",
  "payment-confirmed",
  "payment-declined",
];

describe("registry de cenários (§6)", () => {
  it("contém todos os cenários determinísticos obrigatórios", () => {
    for (const id of REQUIRED) {
      expect(SCENARIOS[id], `cenário ausente: ${id}`).toBeDefined();
    }
  });

  it("toda latência é uma faixa [min,max] válida", () => {
    for (const [id, def] of Object.entries(SCENARIOS)) {
      const [min, max] = def.latency;
      expect(min, id).toBeGreaterThanOrEqual(0);
      expect(max, id).toBeGreaterThanOrEqual(min);
    }
  });
});
