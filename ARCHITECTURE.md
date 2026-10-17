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

## `account` (profile + wallets + favorites, Fase 4)

- **Promoção de `use-wallets` para `src/lib/wallets/` (decisão #2 do orquestrador).** O hook de
  leitura `useWallets(enabled)` vivia em `src/features/checkout/use-wallets.ts`. A feature `wallets`
  (área de conta) também precisa ler `listWallets`/`keys.wallets` para a tela `/wallets` — para não
  criar dependência horizontal feature→feature (o mesmo motivo da extração de `src/lib/cart/`
  documentada acima), o arquivo foi **movido** (lógica inalterada) para
  `src/lib/wallets/use-wallets.ts`. `src/features/checkout/checkout-screen.tsx` teve o import
  reapontado para `@/lib/wallets/use-wallets` — nenhuma outra edição em arquivo do `checkout`. A
  feature `account/wallets` consome o mesmo hook de `@/lib/wallets/use-wallets`, nunca de
  `@/features/checkout`.

- **Três rotas, um `AccountLayout` compartilhado (A1 da spec `account`).** `/profile`, `/wallets`,
  `/favorites` continuam como rotas distintas e privadas (`requireAuth`), cada uma só trocando o
  `component` do placeholder já registrado em `src/app/router.tsx` — nenhuma rota-pai foi criada. A
  sidebar "Meu perfil" do Figma foi extraída como `src/features/account/account-layout.tsx`,
  composto por cada tela via `<AccountLayout active="profile|wallets|favorites">`.

- **Sidebar: Favoritos substitui "Lista de interesse" como item navegável (A2).** O Figma rotula o
  item como "Lista de interesse" (Watchlist); como Favoritos é a feature realmente entregue e
  precisa de um ponto de navegação consistente com o `AccountMenu` do header, o rótulo foi trocado
  para "Favoritos" → `/favorites`. Os demais itens do Figma sem rota/contrato (Atividade, Ofertas,
  Arquivos baixados, Suporte) permanecem visíveis porém inertes (`aria-disabled`, sem `href` e
  **sem `tabIndex`** — não entram na ordem de tabulação, pois não têm ação), conforme §3 do README
  (não fazem parte da entrega). Os itens inertes aparecem **só no desktop**: no mobile não há frame
  Figma de conta e a nav vira uma faixa horizontal apenas com os 3 links reais (decisão A6, sem
  perda funcional).

- **Campos do Figma sem contrato, omitidos (§3/§11).** Perfil: "Nome ENS/.eth", "Apelido da
  carteira", "Website". Carteiras: "Código de indicação", "Nome do perfil", "E-mail da carteira",
  "Nome ENS/.eth", "Igual à carteira principal". Nenhum desses tem campo correspondente em
  `UpdateProfileRequest`/`ChangePasswordRequest`/`CreateWalletRequest` — não foram renderizados como
  campos editáveis (evitaria simular persistência sem backend real).

- **Avatar por URL, sem upload (A-profile-3).** `updateProfile`/`updateAvatar` aceitam só
  `avatarUrl: string`. O botão "Alterar"/"Remover" do Figma opera sobre um campo de texto/URL +
  preview circular, não `<input type=file>`.

- **Redes do `<select>` de cadastro de carteira derivadas do mock (A-wallets-2).** `network` é
  string livre no contrato; não há endpoint que liste redes. O conjunto oferecido no `<select>` é
  `["ethereum", "polygon"]` (as únicas redes usadas em `src/mock/fixtures/users.ts`), unido às redes
  já presentes nas carteiras do usuário corrente (`availableNetworks` em
  `src/features/account/wallets/wallet-schemas.ts`, função pura) para nunca ocultar uma rede legada
  que já exista numa carteira cadastrada.

- **Mutações de carteira por invalidação, não otimistas (A-wallets-1).** Ao contrário do toggle de
  favorito (alta frequência, otimista), cadastro/edição de carteira usam `useMutation({ retry: 0 })`
  → `invalidateQueries(keys.wallets)` em `onSuccess`. Justificativa: a lista de carteiras alimenta o
  checkout: um estado otimista mal reconciliado ali confundiria o usuário num fluxo sensível a
  dinheiro.

- **Sem frame de Favoritos nem frames Mobile de conta (README §3).** A tela `/favorites` foi
  derivada do padrão de grade do catálogo (`NftCard`), com um card próprio
  (`src/features/account/favorites/favorite-card.tsx`) que sobrepõe o botão "Remover dos favoritos".
  O layout mobile/tablet (390/768) do `AccountLayout` — sidebar virando nav horizontal rolável no
  topo — também é derivado (A6), sem frame específico no Figma.
