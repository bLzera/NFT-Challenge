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

## `order-confirmation` (Fase 4)

- **Modal do Figma → página de rota (A2 de `order-confirmation.spec.md`).** O Figma desenha o
  recibo como um "Order Confirmation Modal" (578×821) sobreposto à página de pagamento. Porém a
  `checkout` **navega** (`navigate({ to: "/order/$orderId", params })`) para `/order/$orderId` em
  vez de abrir um modal por cima de si mesma. O recibo foi implementado como **conteúdo de página**
  na rota já registrada `/order/$orderId` (troca só o `component`, A1), preservando fielmente os
  tokens/conteúdo do modal (header de sucesso, Transaction Meta, Detalhes da transação, Footer
  Note). Justificativa: (a) deep-link/refresh direto em `/order/$orderId` precisa funcionar sem o
  checkout montado; (b) é a navegação que a `checkout` já implementa; (c) uma rota dedicada é mais
  testável por Playwright. O backdrop `Color/Ink` do Figma é o próprio fundo do shell.

- **Estado `declined` derivado da `foundation` (A9 de `order-confirmation.spec.md`).** O Figma só
  desenha o caminho feliz (`confirmed`); não há frame para pagamento recusado. Foi criado um estado
  dedicado reaproveitando a estética de `ErrorState`/`Surface Card` (`role="alert"`, título
  "Pagamento recusado", descrição neutra, CTA "Tentar novamente" → `/cart`), sem reexibir o recibo
  de sucesso.
