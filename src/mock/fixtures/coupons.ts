/**
 * Cupons semeados (ver mock.spec.md § Cotação). Cobrem os cenários §6 de cupom inválido/expirado.
 * O resultado é representado INLINE na cotação (`coupon: { code, valid, reason? }`) — mais útil
 * p/ UI do que um erro duro; refina a listagem da Fase 1 que previa `conflict(coupon)`.
 */
import type { CouponRecord } from "../db/types";

export const COUPON_FIXTURES: CouponRecord[] = [
  { code: "WELCOME10", status: "valid", rate: 0.1 },
  { code: "JUNGLE20", status: "valid", rate: 0.2 },
  { code: "EXPIRED5", status: "expired", rate: 0.05 },
  { code: "NOPE", status: "invalid", rate: 0 },
];
