# Architecture

Documento vivo. **Parte 1 — Visão de sistema** descreve as decisões que valem para todo o app
(contratos, transporte, sessão, carrinho, cache, tempo real, limitações). **Parte 2 — Decisões por
feature** registra edições transversais específicas (fora do escopo de uma spec única). Dependências
fora da stack obrigatória: [`DEPENDENCIES.md`](DEPENDENCIES.md). Fluxos e cenários: [`README.md`](README.md).

---

# Parte 1 — Visão de sistema

## Princípio central: fonte única da verdade, sem backend

Não há servidor real. Um **store em memória** (`src/mock/store.ts`), persistido em `localStorage` por
chave `scenario:seed`, é a verdade compartilhada por **REST (MSW)** e pelo **servidor-socket simulado**
(`@mswjs/socket.io-binding`). Tudo — latências, falhas, mudanças de preço, ciclo de vida de pedido — é
roteiro determinístico semeado (`seed`), descrito declarativamente em `src/mock/scenarios/registry.ts`
e aplicado por `src/mock/scenarios/apply.ts`. **Nenhuma resposta fictícia nasce fora da camada de
mock** (critério eliminatório do desafio): componentes/hooks/axios nunca fabricam dado num `catch`.

Os mocks ficam ativos **também no build de produção** (`VITE_ENABLE_MOCKS` default on) — é o que
viabiliza o deploy estático na Vercel.

## Contratos tipados (fonte única de shapes)

`src/contracts/` define schemas **Zod** → tipos inferidos (`Nft`, `Cart`, `Quote`, `Order`, `Session`,
`Favorites`, eventos, erros…). Esses tipos são a única fonte de formato, consumidos por mock, cliente
HTTP **e** UI — a interface nunca redeclara shapes; importa de `@/contracts`. As respostas do cliente
HTTP são validadas em runtime contra os schemas (um payload fora do contrato falha cedo, não silencioso).

**Valores ETH** são **strings decimais** (`decimal.js`), nunca float; quantidades são inteiras. A UI
não faz aritmética de dinheiro — exibe/encaminha strings e usa helpers de `value-types`
(`formatEth`/`addEth`).

## Transporte

- **REST** — base `/api` (Axios). O interceptor injeta `Authorization: Bearer mock-token:<userId>:<expEpoch>`
  a partir do token em `localStorage` (`nft-auth:v1:token`). Funções tipadas 1:1 com os handlers em
  `src/lib/http/api.ts`; erros rejeitam como `HttpError` com `detail: ApiRequestError` (união
  `api`|`network`), ramificável por `isApiCode(detail, "...")`.
- **Socket.IO** — URL lógica fixa `ws://nft-marketplace.mock` + path `/socket.io/` (`src/config/socket.ts`),
  interceptada pelo WebSocket interceptor do MSW — **sem rede real**. O cliente força
  `transports: ["websocket"]` (o MSW não intercepta o fallback long-polling) e `autoConnect: false`
  (quem orquestra a sessão decide quando conectar, após resolver o token).

## Política de sessão e isolamento por usuário

A sessão é **derivada do cache** `keys.session` (`GET /api/auth/session`); o token sobrevive a refresh
via `localStorage`. `src/lib/auth/session.ts` orquestra login/registro/logout:

- **Login/registro** fazem teardown **incondicional** antes de adotar a nova sessão (desconecta socket +
  `queryClient.clear()`) e então reconectam o socket com o novo token — garantindo **isolamento por
  usuário** (nenhum dado do usuário anterior vaza).
- **401 / sessão expirada** → o interceptor limpa o token e o `onUnauthorized` faz o teardown completo
  e zera `keys.session` → a UI reflete logout.
- O **carrinho de visitante** é mesclado à conta ao autenticar (handlers de sessão), preservando itens.

## Estado do carrinho e cotação

- O carrinho é particionado por **dono** (`guest` vs `userId`) no store. A UI só adiciona ao carrinho
  logado (visitante vê link de login).
- A **cotação** é chaveada por `keys.quote(cartVersion, couponCode?)` — por `cartVersion`, não pelo
  conteúdo. Cupom inválido/expirado é representado **inline** (`quote.coupon.valid=false`,
  `coupon.reason`), não como erro.
- **Cenário crítico (preço muda no socket):** a UI compara a `version` cotada com a do carrinho e
  **bloqueia a confirmação** de uma cotação desatualizada até reconfirmar; esgotamento durante a compra
  é recusado como `conflict(availability)` na criação do pedido.
- **Idempotência de pedido:** o checkout gera um `idempotencyKey` e o reusa no retry (mutations
  `retry: 0`); o store devolve o **mesmo** pedido para a mesma chave — clique repetido/timeout não
  duplicam.

## Estratégia de cache (TanStack Query)

- **Keys factory** (`src/lib/query/keys.ts`) centraliza as chaves (session, nft.list/detail, cart,
  favorites, quote, order, profile, wallets) + `normalizeNftQuery` (chave estável casando com o estado
  na URL do catálogo).
- **Retry por código** (`query-client.ts`): não retenta 4xx; retenta transitórios.
- **Mutações:** favoritos usam **otimista + rollback** (alta frequência) — `onMutate` aplica no cache,
  `onError` restaura o snapshot, `onSuccess` adota o estado do servidor (com a `version` autoritativa).
  Carteiras usam **invalidação** (não otimista): alimentam o checkout, onde um estado mal reconciliado
  confundiria num fluxo sensível a dinheiro. O padrão por recurso fica **colado à feature** (decisão da
  Fase 3: só o hook de favoritos foi criado como referência na camada compartilhada).

## Reconciliação REST ↔ Socket.IO

Cada recurso carrega uma **`version`** (só o servidor a incrementa). Os eventos `nft.updated` e
`order.updated` são aplicados ao cache por `src/lib/realtime/apply-events.ts` de forma **idempotente**:
eventos com `version` menor/igual à do cache são **descartados** (tolera duplicados/fora de ordem). No
**reconnect**, o cliente reconcilia o estado. A UI só **lê** o cache — preço/edições/pedido refletem
sozinhos.

> **Limitação conhecida:** no Chromium headless (Playwright/CI) o handshake engine.io do
> `@mswjs/socket.io-binding` não completa, então a entrega **ao vivo** de eventos não ocorre nesse
> ambiente. No browser interativo (dev/preview) o caminho funciona. Os E2E de tempo real verificam o
> **efeito** por refetch e marcam a entrega ao vivo como `test.fixme`; a lógica de dedupe/`version` é
> coberta por unidade (`apply-events.test.ts`). Ver `test/e2e/e2e.spec.md`.

## Design (Figma)

Tokens e specs de componente foram **extraídos do Figma via REST API** (valores exatos, não medidos
sobre imagem) para `design/` e ligados ao `tailwind.config.ts`/`src/index.css` (paleta dark, Roboto
Mono). Desvios pontuais do Figma (modal→rota, rótulos, campos sem contrato omitidos, estados não
desenhados) estão documentados por feature na Parte 2.

## Limitações e escopo

- Sem backend/persistência real; pagamento é simulado.
- Eventos de socket ao vivo indisponíveis no headless (acima).
- Social login e "esqueceu a senha" fora de escopo (não-funcionais no desafio).
- Mobile de conta e tela de favoritos derivados (sem frame Figma).
- Performance mobile abaixo da meta Lighthouse, justificada em `lighthouse/REPORT.md` (SPA + MSW no
  bundle + arte LCP externa).

---

# Parte 2 — Decisões por feature

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
