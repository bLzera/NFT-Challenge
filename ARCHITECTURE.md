# Architecture — decisões transversais

Documento vivo. Registra decisões/edições que atravessam mais de uma feature (fora do escopo normal
de uma spec única), para rastreabilidade na Fase 7.

## `checkout` (Fase 4)

- **Esqueleto intencional `/order/$orderId` (A2 de `checkout.spec.md`).** Registrado em
  `src/app/router.tsx` como rota **privada** (`beforeLoad: requireAuth`) com
  `component: () => <PlaceholderPage title="Pedido" />`, mesmo padrão usado por `/checkout`/`/nft`
  nas fases anteriores: o pós-sucesso do checkout precisa de um destino tipado (`navigate({ to:
  "/order/$orderId", params: { orderId } })`) antes de a feature `order-confirmation` existir. Essa
  feature, quando implementada, troca **só** o `component` (lê `getOrder`/`keys.order.detail`,
  renderiza recibo + modal de confirmação do Figma) — não deve recriar a rota.

- **Extração de `src/lib/cart/` (A8 de `checkout.spec.md`, ajuste da thread principal sobre a A8 de
  `cart.spec.md`).** `use-cart.ts`, `use-quote.ts` e `quote-stale.ts` viviam em `src/features/cart/`
  e seriam necessários também pela `checkout` (revalidação de cotação, contrato `isQuoteStale`).
  Para não criar uma dependência horizontal feature→feature, os três arquivos foram **movidos**
  (lógica inalterada) para `src/lib/cart/`, módulo compartilhado ao lado de `src/lib/favorites/` e
  `src/lib/auth/`. `src/features/cart/cart-screen.tsx` teve os imports reapontados para
  `@/lib/cart/use-cart`, `@/lib/cart/use-quote` e `@/lib/cart/quote-stale`; nenhum outro arquivo da
  `cart` foi tocado. A `checkout` consome os mesmos três artefatos de `@/lib/cart/...` — nunca de
  `@/features/cart`.

  Alternativa descartada: `checkout` importar direto de `@/features/cart/*` (acoplamento feature↔
  feature, viola a separação de fronteiras das specs). Esta extração é a única edição em arquivo da
  `cart` autorizada pela spec de `checkout`, junto com o registro de `/order/$orderId` acima — ambas
  fora de `src/features/checkout/`.
