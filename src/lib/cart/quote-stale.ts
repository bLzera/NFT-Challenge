import type { Cart, Quote } from "@/contracts";
import { eqEth } from "@/contracts";

/**
 * Contrato de obsolescência da cotação (A8, §7): a cotação é obsoleta quando **preço ou
 * quantidade** de uma linha diverge entre o carrinho e a cotação. `quoteLineSchema` não tem
 * `version` (confirmado em `src/contracts/quote.ts`) e `nft.updated` não altera `cart.version`
 * (confirmado em `src/lib/realtime/apply-events.ts`) — por isso a comparação é linha-a-linha via
 * `eqEth`, nunca por `version`. Mudança **só** de `availableEditions` não entra nesta comparação
 * (os totais dependem de preço×quantidade) — fica restrita ao badge "disponibilidade reduzida" por
 * item, calculado separadamente em `cart-screen.tsx`.
 */
export function isQuoteStale(cart: Cart, quote: Quote | undefined): boolean {
  if (!quote) return false;
  return cart.items.some((cartItem) => {
    const quoteLine = quote.items.find((line) => line.nftId === cartItem.nftId);
    if (!quoteLine) return true; // item novo ainda não cotado → cotação não reflete o carrinho.
    const priceDiverges = !eqEth(cartItem.unitPriceEth, quoteLine.unitPriceEth);
    const quantityDiverges = cartItem.quantity !== quoteLine.quantity;
    return priceDiverges || quantityDiverges;
  });
}
