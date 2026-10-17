# Spec — Feature `order-confirmation` (Fase 4)

> **Destino do checkout**: a tela/recibo do pedido na rota `/order/$orderId` (hoje `PlaceholderPage`
> PRIVADO registrado pela `checkout`, `beforeLoad: requireAuth`). Entrega o **recibo como snapshot
> imutável** do pedido e o **ciclo de vida refletido** (pending → confirmed/declined), lido
> **exclusivamente do cache do pedido** que a camada de dados mantém (README §3 "Pagamento e
> confirmação"/recibo, §5 "Pedidos", §6 "confirmado/recusado/timeout", §7 recuperação pós
> refresh/reconexão, §9.6/§9.7/§9.10, §11 eliminatórios). Consome a camada de dados da Fase 3
> (`getOrder`, `keys.order.detail`) e os primitivos/shell/guarda da `foundation` — **não** reimplementa
> tokens, header, estados, guarda de rota nem a aplicação de eventos de socket (a UI **só lê o cache**;
> `order.updated` já é aplicado por `@/lib/realtime`).
>
> Design: `design/components/Desktop_Confirma_o_de_Pedido.md` — o **"Order Confirmation Modal"**
> (578×821, `Color/Surface Card`) com cabeçalho de sucesso ("Seus NFTs agora estão na sua carteira"),
> **Transaction Meta** (ID da transação, Data, Total, Carteira), **Detalhes da transação** (tabela
> NFTs · Edições · Subtotal + Taxa de rede + Total) e **Footer Note** ("Transação confirmada na
> Ethereum…", botão "Ver no Etherscan"). O frame mostra o modal **sobre** a página de pagamento (BG
> `Color/Ink`) — ver A2 sobre apresentação. **Não há frame Mobile dedicado** (`design/components/` só
> tem o Desktop); o layout mobile é derivado dos tokens e das regras de responsivo (README §3.1: "a
> confirmação também deve funcionar em mobile, mesmo sem um frame específico").

## Objetivo e fronteiras

**Entrega:**

1. Troca o `component` da rota `/order/$orderId` (hoje `PlaceholderPage title="Pedido"`, já privada via
   `requireAuth` — registrada pela `checkout`, A2 daquela spec) por `OrderConfirmationScreen`. **Não
   recria a rota** (A1).
2. **Recibo como snapshot imutável** do `Order`: itens (título, imagem, id do token, quantidade, preço
   unitário/total de linha), subtotal, desconto, taxa de rede, total, carteira usada
   (`wallet.address`/`wallet.network`), referência de transação simulada (`txRef`), número do pedido
   (`order.id`) e data (`createdAt`). **Todos os valores vêm do `Order`** — ETH como string decimal,
   **sem aritmética de dinheiro na UI** (usa `formatEth` de `@/contracts`). Alterações posteriores no
   catálogo **não** mudam o recibo (snapshot server-side; A3) (README §3).
3. **Ciclo de vida refletido** (README §6/§7): `pending` → "Confirmando o pagamento…"; `confirmed` →
   recibo de sucesso (modal/tela do Figma); `declined` → estado de recusa. A transição terminal chega
   **somente** por `order.updated` (socket), aplicado pela camada de dados em `keys.order.detail`; a UI
   assina a query e **reflete** — nunca aplica evento, nunca fabrica confirmação (A4, §11).
4. **Deep-link / refresh direto** em `/order/$orderId`: a tela lê do servidor mock (`getOrder`) e
   funciona sem passar pelo checkout (A5). Isolamento por usuário: pedido de outro usuário → `not_found`
   → estado de "não encontrado/sem acesso" (A7).
5. Estados **loading / não-encontrado / erro** via `@/components/state`; **skeleton com shimmer** sem
   layout shift enquanto carrega; `prefers-reduced-motion` respeitado (§8).
6. Links de saída: "Ver no Etherscan" (simulado, não-funcional — A6), "Continuar comprando" → `/`,
   "Ver meus pedidos/perfil" → `/profile` (quando a feature existir; por ora `/`).

**Fora de escopo (não podem aparentar sucesso — §3/§11):**

- **Criação do pedido, idempotência, seleção de carteira/rede, bloqueio por cotação desatualizada,
  simulação de conexão de carteira** — tudo isso é da feature `checkout`. `order-confirmation` **só lê**
  um pedido já criado.
- **"Ver no Etherscan" e o "ID da transação" como link clicável para blockchain real**: `txRef` é uma
  **referência simulada** (README §3: "Referências de transação e links de exploração são simulados").
  O botão renderiza conforme o Figma mas **não** navega para explorador real — é inerte/decorativo com
  indicação acessível de que é simulado. Não pode aparentar transação on-chain real.
- **Edição/re-emissão/cancelamento do pedido**: não há contrato. O recibo é read-only.
- **Remoção de itens do carrinho pós-compra**: o checkout/servidor já cuida (README §3: "após
  confirmação, remover do carrinho apenas os itens e quantidades comprados"); `order-confirmation` não
  mexe no carrinho.
- **Persistência do `pending-order` (localStorage)**: criada e **limpa pela `checkout`**
  (`pending-order-storage.ts`; A8). Esta feature **não** escreve nesse storage.
- Newsletter do footer e navs sociais seguem a `foundation`.

## Decisões

- **A1 — `/order/$orderId` já é rota PRIVADA registrada; a feature troca só o `component`.** A
  `checkout` registrou `orderRoute` em `src/app/router.tsx` (`path: "/order/$orderId"`, `beforeLoad:
  ({ location }) => requireAuth(location.href)`, `component: () => <PlaceholderPage title="Pedido" />`,
  já na `routeTree`). Esta feature substitui esse `component` por `OrderConfirmationScreen`
  (`src/features/order-confirmation/order-confirmation-screen.tsx`). **Sem `validateSearch`** — o único
  estado é o path param `$orderId` (casa com `getOrderParamsSchema.orderId` = `orderIdSchema`, ex.:
  `order-0001`). Nenhuma edição em `src/app/router.tsx` é necessária (a rota já existe). **Não** se
  aplica `normalizeNftQuery`.

- **A2 — Apresentação: página dedicada (rota), não modal sobreposto ao checkout.** O Figma desenha o
  recibo como um "Order Confirmation Modal" **sobre** a página de pagamento. Mas o checkout **navega**
  para `/order/$orderId` (`navigate({ to: "/order/$orderId", params })`, já em `checkout-screen.tsx`),
  trocando de rota — não abre um modal por cima do checkout. Portanto o recibo é renderizado como
  **conteúdo de página** na rota `/order/$orderId` (card centralizado `Color/Surface Card`, largura ~578
  no desktop, full-width no mobile), **preservando fielmente** o conteúdo/tokens do modal do Figma
  (cabeçalho de sucesso, Transaction Meta, Detalhes da transação, Footer Note). Justificativa: (a)
  deep-link/refresh direto precisa funcionar sem o checkout montado (A5/§7); (b) é a navegação que a
  `checkout` já implementa (A2 do `checkout.spec.md`); (c) uma rota dedicada é mais testável por
  Playwright (§9.6). O backdrop escuro do Figma é o próprio `Color/Ink` do shell. Registrar este desvio
  (modal do Figma → página de rota) em `ARCHITECTURE.md`.

- **A3 — Recibo é snapshot imutável, derivado 100% do `Order`.** O `OrderItem` já é snapshot no contrato
  (`{ nftId, title, imageUrl, unitPriceEth, quantity, lineTotalEth }`) e o `Order` carrega
  `{ subtotalEth, discountEth, networkFeeEth, totalEth, wallet: { address, network }, txRef?, createdAt,
  version }`. **A UI não cruza com `Cart`/`Nft` nem refaz cotação** — ao contrário do resumo do
  checkout, aqui título/imagem/preços vêm do próprio pedido (congelados). Nenhuma leitura de `keys.cart`
  ou do catálogo. `nft.updated` posterior **não** altera o recibo (não há join com o catálogo). ETH
  sempre via `formatEth`; nenhuma soma/`Number()` de dinheiro.

- **A4 — Ciclo de vida: a UI só lê `keys.order.detail`; a transição vem do socket (camada de dados).**
  Nenhum `socket`/listener/`setQueryData` de evento nesta feature. `@/lib/realtime`
  (`onOrderUpdated`) já patcheia a entrada de cache existente com `status` + `txRef` (dedupe por
  `version`, descarta antigos/duplicados). A tela renderiza por `order.status`:
  - `pending` → painel "Confirmando o pagamento…" (spinner/`aria-busy`, `role="status"`,
    `aria-live="polite"`), **sem** recibo de sucesso. Nunca mostra "confirmado" enquanto `pending`
    (§3/§11).
  - `confirmed` → recibo completo (modal/tela do Figma): cabeçalho de sucesso, Transaction Meta,
    Detalhes, Footer Note.
  - `declined` → estado de recusa (ver A9): título "Pagamento recusado", explicação, CTA para tentar de
    novo (volta a `/cart` → `/checkout`). **Sem** recibo de sucesso.
  Pedidos terminais (`confirmed`/`declined`) **não regridem** (dedupe por `version` na camada de dados).

- **A5 — Deep-link/refresh: `useOrderConfirmation(orderId)` lê do servidor mock.** A tela consome o
  path param `$orderId` e dispara `getOrder(orderId)` via `useQuery({ queryKey:
  keys.order.detail(orderId), queryFn, enabled: Boolean(orderId), retry: 0 })`. Se o pedido já estava
  em cache (navegação vinda do checkout, que semeou `keys.order.detail` em `use-create-order`), serve do
  cache; em refresh direto, refetcha do servidor. Na reconexão, `initRealtime` já faz
  `invalidateQueries({ type: "active" })` → o `keys.order.detail` ativo é refetchado. **Reusa o hook
  existente `useOrder` de `src/features/checkout/use-order.ts`?** — ver A10: **cria o próprio hook**
  colado à feature para não acoplar a `checkout`; a lógica é idêntica (mesma `queryKey`/`queryFn`, então
  os caches coincidem e a navegação do checkout serve do cache sem refetch).

- **A6 — "ID da transação" e "Ver no Etherscan" são simulados (não-funcionais).** `txRef` (ex.:
  `0xtx-order-0001` no mock) é exibido como "ID da transação" (truncado no estilo `0xA91F…E82C` do
  Figma, mas a partir do `txRef` real do pedido — **sem** fabricar hash). O botão "Ver no Etherscan"
  renderiza conforme o Figma, porém é **inerte** (não há explorador real): marcado `aria-disabled` com
  texto/tooltip de que a referência é simulada (§3). Enquanto o pedido é `pending` (ou `txRef` ausente),
  a seção de transação não mostra hash fabricado — mostra "—"/estado de confirmando.

- **A7 — Isolamento por usuário: pedido inexistente/alheio → `not_found` → estado dedicado.** O store do
  mock isola pedidos por dono; `getOrder` de id inexistente ou de outro usuário responde `not_found`
  (404). A UI ramifica via `isApiCode(HttpError.detail, "not_found")` para um `EmptyState`/`ErrorState`
  "Pedido não encontrado" com CTA para `/` — **sem** vazar dados nem fabricar recibo (eliminatório §11).
  `forbidden` (403), se ocorrer, mapeia para "Sem acesso a este pedido".

- **A8 — Fronteira do `pending-order` storage: a `checkout` escreve e limpa; esta feature não toca.** O
  `pending-order-storage.ts` vive em `src/features/checkout/`. A `checkout` grava o `orderId` em voo
  (`writePendingOrderId`) e, ao detectar que ele é terminal via `getOrder`, **limpa**
  (`clearPendingOrderId`) e navega para `/order/$orderId` — isso já está em `checkout-screen.tsx`
  (`useEffect` que chama `clearPendingOrderId()` + `navigate`). `order-confirmation` **não** lê nem
  escreve esse storage: quem orquestra a recuperação do pending é o checkout; a tela de confirmação só
  precisa do `orderId` da URL + `getOrder`. (Nota: quando o pedido ainda chega `pending` no checkout, o
  checkout também navega para `/order/$id` após `createOrder`; a confirmação então mostra "confirmando"
  e aguarda o socket — o storage permanece até o checkout ser remontado e reconciliar, o que é
  aceitável porque o `idempotencyKey` em memória + o id persistido impedem duplicação.)

- **A9 — Estado `declined` não está no Figma — derivar da `foundation`.** O Figma só desenha o caminho
  feliz (`confirmed`). Para `declined` (README §6 "pagamento recusado"), usar um estado dedicado
  (reaproveita a estética de `ErrorState`/card `Surface Card`): ícone/título "Pagamento recusado",
  descrição neutra ("O pagamento não foi concluído. Nenhum valor foi cobrado."), e CTA "Tentar
  novamente" → `/cart` (o usuário refaz o checkout). **Não** reexibe o recibo de sucesso. Registrar este
  estado derivado em `ARCHITECTURE.md` como complemento ao Figma.

- **A10 — Hook colado à feature (`use-order-confirmation.ts`), espelhando `useOrder`.** Decisão da Fase
  3: hooks de leitura colados à feature. Para evitar dependência horizontal `order-confirmation →
  checkout`, criar `src/features/order-confirmation/use-order-confirmation.ts` com a **mesma**
  `queryKey`/`queryFn`/`enabled`/`retry:0` do `useOrder` do checkout (os caches coincidem por chave,
  então nada é duplicado em runtime). Alternativa descartada: importar `useOrder` de
  `@/features/checkout/use-order` (acopla duas features irmãs). Se o orquestrador preferir **não**
  duplicar ~15 linhas, o fallback aceitável é promover `useOrder` para `src/lib/order/use-order.ts` e os
  dois (checkout + order-confirmation) importarem de lá — **requer aprovação por tocar na `checkout`**.
  Recomendação: duplicar o hook pequeno (zero toque na `checkout`).

## Telas e layout

### Desktop (`Desktop_Confirma_o_de_Pedido.md` → "Order Confirmation Modal", 578 de largura)

Card `Color/Surface Card` (#241612), centralizado sobre `Color/Ink`, dividido por linhas
`Color/Primary` (`Rectangle 92/93`, 1px):

- **Modal Header** (coluna, gap 16, centralizado): ícone/ilustração de sucesso (vetores `Color/Primary`
  — usar um ícone `lucide` `CheckCircle`/badge em `primary`) + texto **"Seus NFTs agora estão na sua
  carteira"** (`Text/Secondary`, `Body Large/16 Bold`).
- **Transaction Meta** (linha, `SPACE_BETWEEN`, padding 4 36, divisórias verticais `Color/Primary`):
  quatro blocos rótulo/valor (`Text/Secondary`):
  - **ID da transação** → `order.txRef` truncado (`0xA91F…E82C`) — A6.
  - **Data** → `order.createdAt` formatada `29 Jul, 2026` (pt-BR, ver abaixo).
  - **Total** → `formatEth(order.totalEth)` + " ETH".
  - **Carteira** → rótulo/label da carteira ou `order.wallet.network`/endereço truncado (o `Order` traz
    `wallet: { address, network }`; o Figma mostra "MetaMask" — como o pedido não guarda o *label* da
    carteira, exibir a **rede** ou o **endereço truncado** da carteira do pedido; **não** fabricar
    "MetaMask"). Ver A3.
- **Transaction Details** (coluna, padding 20 44 48 44):
  - Título **"Detalhes da transação"** (`Body/15 Bold`).
  - **Table Header** (linha, `SPACE_BETWEEN`): "NFTs" · "Edições" · "Subtotal" (`Body Large/16`),
    divisória `Color/Primary` 0.3px.
  - **Items**: uma linha por `order.items[]` (card `Color/Surface Card`): artwork 70×70 radius 8
    (`alt` = `item.title`), título (`Body Large/16 Bold`, `Color/Foreground`), "ID do token: #…"
    derivado do `item.nftId`/título (`Color/Secondary`), "(x N)" = `item.quantity` (`Text/Secondary`),
    e total de linha `formatEth(item.lineTotalEth)` + " ETH" (`Text/Accent`, `Body Large/18 Bold`).
  - **Totals**: "Taxa de rede" → `formatEth(order.networkFeeEth)`; "Total" → `formatEth(order.totalEth)`
    (`Text/Accent`, `Body Large/18 Bold`). (Subtotal/desconto já aparecem no header/linha; manter
    paridade com o Figma: o modal mostra Taxa de rede + Total nos "Totals".)
  - Divisória `Color/Primary` 0.3px.
  - **Footer Note**: texto "Transação confirmada na Ethereum. A propriedade foi transferida para sua
    carteira conectada." (`Text/Secondary`, `Body/14`) + botão **"Ver no Etherscan"** (`Color/Primary`,
    radius 5, texto `Color/Ink`) — inerte/simulado (A6).

### Mobile (sem frame dedicado — derivar)

Card ocupa a largura da viewport (margens laterais do shell), empilhado: header de sucesso → meta
(empilha os 4 blocos em coluna/grid 2×2 sem overflow) → lista de itens (stack) → totais → footer note
+ CTA. Tokens idênticos; sem overflow horizontal em 390. README §3.1 exige a confirmação funcional em
mobile mesmo sem frame.

### Estados não desenhados (seguem a `foundation`)

- **Loading** (`getOrder` pendente, deep-link): skeleton shimmer com a silhueta do card (header + 3
  linhas de item + totais), sem layout shift.
- **`pending`** (pedido criado, aguardando socket): painel "Confirmando o pagamento…" com
  spinner/`aria-busy`, `role="status"`, `aria-live="polite"`; mostra os itens/total do pedido (já
  conhecidos) mas **não** o selo de sucesso nem o `txRef`.
- **`declined`**: estado de recusa (A9).
- **`not_found`/`forbidden`**: `EmptyState`/`ErrorState` "Pedido não encontrado"/"Sem acesso",
  CTA → `/` (A7).
- **Erro transitório/rede** no `getOrder`: `ErrorState` com "Tentar novamente" (`refetch`), sem fabricar
  recibo.

> Data formatada com `Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" })`
> (nativo, sem dep nova). Preservar tipografia/cores/espaços/tokens nomeados do Figma. Quantidade como
> "(x N)".

## Roteamento e navegação

- `/order/$orderId` **já registrada** e privada (A1) — trocar só o `component` por
  `OrderConfirmationScreen`. Visitante → `requireAuth` → `/login?redirect=/order/<id>`.
- Entrada típica: `navigate` do checkout (preserva o cache de `keys.order.detail` semeado em
  `use-create-order`). Deep-link/refresh direto também funciona (A5).
- CTAs de saída: "Continuar comprando" → `<Link to="/">`; "Ver meus pedidos" → `/profile` (quando
  existir; por ora `/`). "Ver no Etherscan" é inerte (A6).
- `declined` → CTA "Tentar novamente" → `<Link to="/cart">` (A9).
- Navegação SPA para preservar o cache.

## Dados, hooks e mutations

Consome **apenas** `@/contracts` + `@/lib/*`; nunca Axios/handlers direto; nunca redeclara shapes.
Hooks colados à feature em `src/features/order-confirmation/`. **Nenhuma mutation** nesta feature (recibo
read-only).

- **Pedido:** `useOrderConfirmation(orderId)` (`src/features/order-confirmation/use-order-confirmation.ts`)
  → `useQuery({ queryKey: keys.order.detail(orderId), queryFn: () => getOrder(orderId), enabled:
  Boolean(orderId), retry: 0 })`. `getOrder` de `@/lib/http/api`; `keys.order.detail` de
  `@/lib/query/keys`; tipo `Order`/`OrderId` de `@/contracts`. Mesma chave do checkout → serve do cache
  quando vindo da navegação; refetcha em refresh direto (A5, A10).
- **Sessão:** `useSession()` (`@/lib/auth/use-session`) apenas para o gating já garantido pelo
  `requireAuth`; não é necessário para montar o recibo (o pedido é do usuário autenticado).
- **Path param:** via `getRouteApi("/order/$orderId").useParams()` (ou o hook de params do TanStack
  Router da rota), tipado como `{ orderId: OrderId }` (casa com `getOrderParamsSchema`).
- **ETH:** `formatEth` de `@/contracts` para todos os valores; nenhuma aritmética.
- **Tempo real:** nenhuma assinatura/listener aqui — a query reflete as mutações de cache de
  `@/lib/realtime` automaticamente (React Query re-render on cache change).

## Validação e mapeamento de erros

Sem formulário/validação de cliente (recibo read-only). Ramificação de **leitura** por
`isApiCode(HttpError.detail, …)` de `@/lib/http/errors`:

| Cenário | `code` (status) / fonte | Tratamento na UI |
| --- | --- | --- |
| Pedido inexistente ou de outro usuário | `not_found` resource `order` (404) | `EmptyState`/`ErrorState` "Pedido não encontrado" + CTA → `/`. **Sem** recibo fabricado; isolamento §11. |
| Sem acesso ao pedido | `forbidden` (403) | `ErrorState` "Sem acesso a este pedido." + CTA → `/`. |
| Falha transitória / rede no `getOrder` | `transient` (503) / `network` | `ErrorState` com "Tentar novamente" (`refetch`); mantém a tela; nada de recibo fabricado. |
| Sessão expirada ao abrir o deep-link | `unauthenticated` (401) | `requireAuth` já redireciona no `beforeLoad`; se o 401 ocorrer em voo, o interceptor global faz teardown e a rota reavalia → `/login?redirect=/order/<id>`. |
| Pedido `pending` (sem `txRef`/sem confirmação) | — (status do próprio `Order`) | Painel "Confirmando o pagamento…" (A4); **nunca** exibir sucesso/`txRef` fabricado (§11). |
| Pedido `declined` | — (status do próprio `Order`) | Estado de recusa (A9); CTA → `/cart`. |

> **Sem dado fabricado no catch (eliminatório §11):** o recibo de sucesso só aparece para `order.status
> === "confirmed"` **na simulação** (status vem do servidor/socket). `txRef`, total e itens vêm sempre
> do `Order` real — nunca inventados em erro/timeout. "Ver no Etherscan" é inerte (A6).

## Tempo real (§7)

- A UI **só lê o cache**: nenhum `socket`, listener ou `setQueryData` de evento nesta feature.
  `@/lib/realtime` (`onOrderUpdated`) já patcheia `keys.order.detail` com `status`+`txRef` (dedupe por
  `version`). A `useQuery` re-renderiza quando o cache muda → a tela transita `pending → confirmed` /
  `pending → declined` sozinha.
- **Pedido pendente + queda/reconexão (§7):** o estado `pending` fica em cache; na reconexão
  `initRealtime` reconcilia (`invalidateQueries({ type: "active" })`) e `order.updated` aplica o estado
  terminal. Em **refresh** direto, `getOrder(orderId)` (A5) recupera o estado real do servidor sem criar
  outra compra (a criação é da `checkout`; aqui só se lê). Pedidos `confirmed`/`declined` são
  **terminais** — não regridem (dedupe por `version`).

## Acessibilidade (§8)

- Transição de estado anunciada: `pending` → `role="status"` `aria-live="polite"` ("Confirmando o
  pagamento…"); `confirmed` → o título de sucesso é o nome acessível da região (`<h1>`/`aria-labelledby`);
  `declined` → `role="alert"` para a recusa.
- Artworks dos itens com `alt` = `item.title`. Tabela de itens com cabeçalho semântico (ou `role`
  apropriado) ligando colunas NFTs/Edições/Subtotal.
- "Ver no Etherscan" inerte: `aria-disabled` + texto/tooltip de "referência simulada" (não aparenta
  ação real, §3).
- Foco: ao montar `confirmed`, mover foco para o título do recibo (ou início do card) para leitores de
  tela; `declined` move foco para o alerta. Foco visível (ring `primary`) em todos os CTAs.
- Contraste conforme tokens Kurio; `prefers-reduced-motion` (shimmer/spinner já no `index.css`).
- Teclado 100%; responsivo 390/768/1440 sem overflow horizontal.

## Critérios de aceitação

1. `/order/$orderId` renderiza `OrderConfirmationScreen` (troca só o `component`; rota permanece
   privada — visitante → `/login?redirect=/order/<id>`). Nenhuma edição em `src/app/router.tsx`.
2. Recibo `confirmed` fiel ao Figma (card `Surface Card`, header de sucesso, Transaction Meta, Detalhes
   da transação, Footer Note), com tokens nomeados; mobile funcional sem overflow em 390.
3. **Snapshot imutável**: itens, quantidades, preços, subtotal/desconto/taxa/total, carteira, `txRef`,
   id e data vêm **só** do `Order` (ETH via `formatEth`); nenhum cruzamento com `Cart`/catálogo; nenhuma
   aritmética de dinheiro; `nft.updated` posterior não altera o recibo.
4. **Ciclo de vida**: `pending` mostra "Confirmando…" (sem sucesso/`txRef`); `order.updated` confirmed →
   recibo; declined → estado de recusa. A UI **só lê** `keys.order.detail` (nenhum socket/listener na
   feature). Sucesso só para `status === "confirmed"`.
5. **Deep-link/refresh** direto em `/order/$orderId` carrega o recibo via `getOrder`; reconexão
   reconcilia; pedidos terminais não regridem.
6. **Isolamento (§11)**: pedido inexistente/alheio → `not_found` → estado "não encontrado" (sem vazar
   dados, sem recibo fabricado). Nenhum dado fabricado em catch/timeout.
7. "Ver no Etherscan"/"ID da transação" renderizam conforme o Figma porém simulados/inertes (§3), com
   indicação acessível.
8. a11y: transições anunciadas (status/alert), foco movido ao montar terminal, labels/`alt` associados,
   teclado, contraste, reduced-motion.
9. `tsc`, `npm run lint`, `npm run test`, `npm run build` limpos; sem regressão (suíte da base verde).
10. Desvios do Figma documentados em `ARCHITECTURE.md` (modal → página de rota A2; estado `declined`
    derivado A9). Se adotado o fallback do A10 (promover `useOrder` para `@/lib`), isso **requer
    aprovação** por tocar na `checkout` e também vai ao `ARCHITECTURE.md`.

## Verificação

- Dev: concluir uma compra no `/checkout` (logar `collector@example.com` / `password123`, montar
  carrinho, confirmar) → navega para `/order/$orderId` em `pending` → "Confirmando…".
- Cenários do mock (`window.__mock` / `?scenario=`):
  - `payment-confirmed` → após `order.updated: confirmed`, a tela mostra o recibo de sucesso com `txRef`
    real.
  - `payment-declined` → a tela mostra o estado de recusa (A9); nenhum recibo de sucesso.
  - `order-timeout` → o checkout recupera o mesmo pedido (idempotência); ao navegar para `/order/$id`,
    a confirmação reflete o estado real (pending → terminal) sem duplicar.
  - Deep-link: abrir `/order/<id-de-pedido-existente>` direto / dar refresh → recibo recarrega via
    `getOrder` (cache ou servidor).
- Isolamento (§11): logado como `trader@example.com`, abrir `/order/<id-de-collector>` → `not_found` →
  estado "pedido não encontrado"; não vaza dados.
- Snapshot: após confirmar, mudar o preço do NFT no catálogo (cenário `price-changed`) não altera os
  valores do recibo.
- Teclado: operar CTAs/Etherscan (inerte); foco visível; sem overflow em 390/768/1440.

## Testabilidade (preparar p/ Playwright §9.6/§9.7/§9.10)

- Roles/labels estáveis: título de sucesso ("Seus NFTs agora estão na sua carteira"), região
  "Detalhes da transação" (cada item com nome acessível = título do NFT), rótulos "ID da transação /
  Data / Total / Carteira", linhas "Taxa de rede / Total", botão "Ver no Etherscan", painel
  "Confirmando o pagamento…" (status), estado "Pagamento recusado" (alert), estado "Pedido não
  encontrado" (empty/error).
- Fluxos-alvo: **§9.6** (compra completa catálogo→recibo confirmado — este é o passo final),
  **§9.7** (falha/recusa de pagamento e recuperação do mesmo pedido após timeout — a confirmação
  reflete o estado terminal certo sem duplicar), **§9.10** (eventos duplicados/antigos e retomada de
  pedido pendente após desconexão/refresh — o recibo reconcilia e não regride). Todos dirigíveis por
  cenário do mock + reset determinístico; a transição terminal passa **sempre** pelo cliente Socket.IO
  (nunca setters diretos na UI — §6/§11).
