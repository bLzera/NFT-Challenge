import { useQuery } from "@tanstack/react-query";
import { createQuote } from "@/lib/http/api";
import { keys } from "@/lib/query/keys";

/**
 * Cotação (A6/A7): chaveada por `cartVersion` + cupom — refetch automático quando a versão muda.
 * `enabled: itemCount > 0` — não cotar um carrinho vazio. Para visitante, `createQuote` responde
 * `unauthenticated` (A1); a tela trata esse erro como pré-visualização, não como expiração de
 * sessão (ver `cart-screen.tsx`).
 */
export function useQuote(cartVersion: number, itemCount: number, couponCode?: string) {
  return useQuery({
    queryKey: keys.quote(cartVersion, couponCode),
    queryFn: () => createQuote({ cartVersion, couponCode }),
    enabled: itemCount > 0,
    retry: 0,
  });
}
