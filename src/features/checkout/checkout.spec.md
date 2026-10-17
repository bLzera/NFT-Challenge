# Spec — Feature `checkout` (Fase 4)

> Feature de **pagamento/finalização** na rota `/checkout` (hoje placeholder PRIVADO registrado pela
> `cart`, `beforeLoad: requireAuth`). É a feição mais crítica do desafio — fecha o cenário §7. Entrega
> **revalidação da cotação, dados de carteira/rede com simulação de conexão, submit idempotente,
> bloqueio por cotação desatualizada e ciclo de vida do pedido** (README §3 "Pagamento e confirmação",
> §4, §5 "Cotação" + "Pedidos", §6 "timeout/confirmado/recusado", §7 cenário crítico + pedido pendente,
> §9.6/§9.7/§9.9/§9.10). Consome a camada de dados da Fase 3 (`createQuote`/`createOrder`/`getOrder`,
> `listWallets`, `keys.quote`/`keys.order`), o contrato `quoteStale` estabelecido pela `cart` e os
> primitivos/rotas/shell da `foundation` — não reimplementa tokens, header, estados, guarda de rota nem
> a aplicação de eventos de socket (a UI **só lê o cache**).
>
> Design: `design/components/Desktop_Pagamento.md` (perfil do colecionador à esquerda, "Seus NFTs" +
> resumo + "Carteira e rede" + "Confirmar compra" à direita) e `Mobile_Pagamento.md` ("Pagamento com
> carteira", "Carteira conectada / Trocar carteira", resumo e CTA). Dark, Roboto Mono. O **modal de
> confirmação** do Figma (em `Desktop_Confirma_o_de_Pedido.md`) pertence à feature
> `order-confirmation` (rota `/order/$id`), não a esta — ver A2.

## Objetivo e fronteiras

**Entrega:**

1. Troca o `component` da rota `/checkout` (hoje `PlaceholderPage`, já privada via `requireAuth`) por
   `CheckoutScreen`. Não recria a rota (A1).
2. **Revalidação da cotação antes de finalizar**: lê/renova `createQuote({ cartVersion, couponCode })`
   com a `cart.version` atual e exibe o **resumo final** (subtotal/desconto/taxa/total e linhas por
   item) **exclusivamente** da `Quote` — ETH como string decimal, sem aritmética de dinheiro na UI (A6).
3. **Carteira e rede + simulação de conexão**: lista as carteiras reais do usuário (`listWallets`),
   permite escolher uma e a rede, e simula um estado de **conexão** local ("Conectar carteira" →
   "Carteira conectada", e "Trocar carteira"/"Desconectar") — **sem** fabricar dado persistente nem
   aparentar transação real (A4, §11).
4. **Submit idempotente** (§5): `createOrder` com `idempotencyKey` gerado uma vez no fluxo e **reusado
   em retry** (mesmo key → mesmo pedido); mutation `retry: 0`; clique repetido/duplo não cria pedido
   duplicado (A7).
5. **Bloqueio por cotação desatualizada** (§7, cenário crítico): consome `isQuoteStale(cart, quote)`
   (contrato da `cart`, A8 de `cart.spec.md`); se obsoleta, **bloqueia a confirmação** até o usuário
   revisar/reconfirmar (revalida a cotação) (A5, A8).
6. **Ciclo de vida do pedido**: criação (`pending`) → confirmando → `confirmed`/`declined` via
   `order.updated` (a camada de dados aplica em `keys.order.detail`; a UI só lê); **timeout** pós-pedido
   com recuperação por idempotência (§6); recuperação após refresh/reconexão sem criar outra compra (A9).
7. **Pós-sucesso** navega para a confirmação (`/order/$id`, feature `order-confirmation`), registrada
   agora como placeholder privado (A2).
8. **Expiração de sessão durante o checkout**: o `redirect` da `auth` já preserva a rota; ao voltar, a
   cotação/carrinho refazem (A10).
9. Estados **loading / vazio / erro** via `@/components/state`; **skeletons com shimmer** no resumo e na
   lista de "Seus NFTs" (§8), sem layout shift.

**Fora de escopo (não podem aparentar sucesso — §3/§11):**

- **Conexão real** com extensão de carteira/blockchain/gateway: não existe. A conexão é **simulação de
  estado local** (A4); os brandings "MetaMask / WalletConnect / Coinbase / METAMASK • WALLETCONNECT •
  COINBASE" do Figma são **decorativos** e **não** disparam integração — não podem aparentar conectar a
  uma extensão real.
- **Campos editoriais do "Perfil do colecionador"** do Figma que **não** compõem o pedido: "Código de
  indicação", "Nome ENS/.eth", "Observação do colecionador (opcional)", "Nome do perfil/Nome de
  usuário" duplicados. Não há contrato para eles em `CreateOrderRequest` (só `quoteVersion`, `walletId`,
  `network`, `idempotencyKey`). Ver A3: renderizar o mínimo funcional e **não** fabricar persistência
  para campos sem contrato.
- A **tela/modal de confirmação** (recibo, "ID da transação", "Seus NFTs agora estão na sua carteira")
  é da feature `order-confirmation` (rota `/order/$id`, A2). `checkout` só cria o pedido e navega.
- **Edição/cadastro de carteiras** é da feature `wallets` (rota `/wallets`). `checkout` apenas **lê**
  `listWallets`; se o usuário não tiver carteira, direciona para `/wallets` (A4) — não cria carteira aqui.
- Newsletter do footer e nav sociais seguem o comportamento já definido na `foundation`.

## Decisões

- **A1 — `/checkout` já é rota PRIVADA registrada; a feature troca só o `component`.** A `cart`
  registrou `checkoutRoute` (`path: "/checkout"`, `beforeLoad: ({ location }) => requireAuth(location.href)`,
  `component: () => <PlaceholderPage title="Pagamento" />`) em `src/app/router.tsx`. A `checkout`
  substitui esse `component` por `CheckoutScreen` (`src/features/checkout/checkout-screen.tsx`). **Sem
  `validateSearch`** — o checkout não tem estado de URL (carrinho/cotação são server-side; a seleção de
  carteira/rede e o estado de conexão são efêmeros do fluxo). Não se aplica `normalizeNftQuery`.

- **A2 — Registrar `/order/$id` como placeholder privado agora (mesmo padrão de `/nft` e `/checkout`).**
  O pós-sucesso do checkout precisa de um `Link`/`navigate` tipado do TanStack Router; links tipados
  exigem a rota registrada. Registrar `orderRoute` (`path: "/order/$orderId"`, **privada** via
  `beforeLoad: ({ location }) => requireAuth(location.href)`, `component: () => <PlaceholderPage
  title="Pedido" />`) e adicioná-la à `routeTree`. A feature `order-confirmation` depois troca só o
  `component` (lê `getOrder`/`keys.order.detail`, renderiza o recibo + o modal do Figma). **Esta é a
  única edição fora de `src/features/checkout/`** e deve ser registrada em `ARCHITECTURE.md` como
  esqueleto intencional. Param de rota: `$orderId` (bate com `getOrderParamsSchema.orderId` =
  `orderIdSchema`, ex.: `order-0001`).

- **A3 — "Perfil do colecionador" = pré-preenchido, read-only, derivado da sessão; sem campos
  fabricados.** O formulário de perfil do Figma é em grande parte **não contratual** para o pedido. O
  checkout exibe o bloco "Perfil do colecionador" com os dados **reais** da sessão/perfil
  (`useSession()`/`getProfile`): nome de exibição e e-mail (read-only, apenas revisão — §3 "Validar os
  campos do layout e permitir revisão antes do envio"). Os únicos campos **funcionais** são os que
  alimentam `CreateOrderRequest`: **rede** e **carteira** (seleção) + o estado de **conexão**. Campos
  decorativos (código de indicação, ENS/.eth, observação, nome do perfil duplicado) ou são **omitidos**
  do MVP ou renderizados **desabilitados com indicação de que não são usados na simulação** — nunca
  aparentam salvar/persistir (§3/§11). "Observação do colecionador (opcional)" pode ser mantida como
  textarea puramente local sem efeito no pedido (não vai ao `createOrder`), rotulada como opcional e
  não enviada. Registrar este desvio do Figma em `ARCHITECTURE.md`.

- **A4 — Carteira/rede: dados reais de `listWallets`; conexão é SIMULAÇÃO de estado local.** Não há
  carteira/extensão/rede real nem contrato de conexão. O que é **real**: `GET /api/wallets`
  (`listWallets` → `Wallet[]`, cada `{ id, label, address, network, role }`) e o `createOrder` com
  `walletId` + `network` (string livre). O que é **simulado** (estado local, não persistido):
  - Um **botão "Conectar carteira"** que alterna um estado local `connection: "disconnected" |
    "connecting" | "connected"`. "connecting" é um atraso curto puramente de UI para feedback
    (spinner/`aria-busy`), **sem** chamada de rede e **sem** fabricar endereço/saldo. Figma mobile:
    "Carteira conectada" + "Trocar carteira"; desktop: seleção de carteira/rede + "Usar outra carteira?".
  - Enquanto `connection !== "connected"`, a confirmação fica **bloqueada**.
  - A **seleção de carteira** vem de `listWallets` (`Selecione uma carteira` → dropdown com `label` +
    endereço truncado + rede). O campo **"Endereço da carteira"** (read-only) e **"Tipo de carteira"**
    (`role` primary/secondary) exibem os dados reais da carteira escolhida — não editáveis aqui.
  - A **rede** (`Selecione uma rede`) default = `network` da carteira escolhida; o usuário pode escolher
    entre as redes das suas carteiras (ex.: `ethereum`, `polygon`). Enviada como `network` em
    `CreateOrderRequest` (string). Não inventar redes que não existam nas carteiras do usuário.
  - **Sem carteiras** (`listWallets` → `[]`, caso de usuário recém-cadastrado): exibir `EmptyState`
    ("Cadastre uma carteira para finalizar.") com CTA `<Link to="/wallets">`; confirmação indisponível.
    Nunca permitir finalizar sem `walletId` real.
  - A **"recusa de conexão" e "desconexão"** (§3 "simulação de conexão, recusa e desconexão") são
    estados locais: "Desconectar" volta a `disconnected`; um caminho de "recusa" (ex.: botão
    "Simular recusa" ou cenário) leva a `disconnected` + aviso acessível "Conexão recusada." — **sem**
    efeito no servidor e sem aparentar transação. Esses estados **não** criam pedido.

- **A5 — A confirmação revalida a cotação ANTES de criar o pedido.** Ao entrar no checkout e a cada
  mudança de `cart.version`, `useQuote(cart.version, itemCount, coupon)` (reusado de `@/lib/cart/use-quote.ts`) mantém `keys.quote` fresca. O botão "Confirmar compra" só habilita quando: há sessão,
  há carteira+rede selecionadas, `connection === "connected"`, há cotação válida (`Quote`), e
  `isQuoteStale(cart, quote) === false`. Antes de disparar `createOrder`, garantir que a cotação em
  cache corresponde à `cart.version` atual (a chave já força refetch quando a versão muda); se a
  cotação estiver obsoleta/ausente, **não** finaliza — mostra o aviso de revisão (A8).

- **A6 — Totais e itens vêm só da `Quote`; a UI não soma dinheiro.** "Seus NFTs", subtotal, "Desconto
  do lançamento", "Taxa de rede" ("Taxa estimada"), Total — todos lidos de `Quote`
  (`items[].{quantity, unitPriceEth, lineTotalEth}`, `subtotalEth`, `discountEth`, `networkFeeEth`,
  `totalEth`) e formatados com `formatEth` (`@/contracts`). Nenhum `Number()`/float em dinheiro; nenhum
  total confirmado fabricado no catch (§11). Enquanto a cotação carrega, mostrar skeleton shimmer no
  resumo (não valores inventados). O título/imagem/ID de cada linha do resumo vêm do `Cart`
  (`keys.cart`) casado por `nftId` com a linha da `Quote` (a `Quote` só traz `nftId`/quantidade/preços;
  título/`imageUrl` vêm do `Cart`).

- **A7 — `idempotencyKey` gerado uma vez por "tentativa de compra" e reusado em retry.** Gerar o key
  (`crypto.randomUUID()`) **quando o usuário inicia a confirmação** e guardá-lo em `ref`/estado do
  fluxo enquanto a mesma tentativa estiver viva (mesma cotação/carteira/rede). Reenvios após
  **timeout/erro transitório/clique repetido** usam **o mesmo key** → o store replica o mesmo pedido
  (`replayed: true`, 200), sem duplicar. O key só é **renovado** quando a tentativa muda materialmente
  (nova cotação após obsolescência, troca de carteira/rede) — porque enviar o mesmo key com
  `{ quoteVersion, walletId, network }` diferente gera `conflict(idempotency_mismatch)` no store. A
  mutation é `retry: 0` (nunca retenta sozinha; o retry é **ação explícita do usuário** reusando o
  key). O botão fica desabilitado/`aria-busy` enquanto `isPending` e enquanto o pedido estiver
  `pending` aguardando resolução — impede duplo-clique criar segunda chamada.

- **A8 — `quote-stale.ts` extraído para um módulo compartilhado; `cart` e `checkout` importam dele.**
  `isQuoteStale(cart, quote)` vivia em `src/features/cart/quote-stale.ts`; importá-lo de `cart` para
  `checkout` acoplaria duas features irmãs (dependência horizontal feature→feature). **Feito (aprovado):**
  os módulos de carrinho compartilhados foram movidos para `src/lib/cart/` — `quote-stale.ts`,
  `use-cart.ts` e `use-quote.ts` — exportando `isQuoteStale`/`useCart`/`useQuote`, e o import da `cart`
  (`cart-screen.tsx`) foi reapontado para `@/lib/cart/*` (mover + reapontar import; a lógica não muda).
  Registrado em `ARCHITECTURE.md`. A comparação continua por **preço+quantidade por linha via `eqEth`**
  (nunca por `version`), conforme A8 de `cart.spec.md`.

- **A9 — Pedido pendente é recuperável; a UI só lê o cache do pedido.** Após `createOrder` resolver
  (201 original **ou** 200 replay), escrever o `Order` em `keys.order.detail(order.id)` via
  `setQueryData` — isto é **obrigatório**: `onOrderUpdated` (camada de dados) só patcheia o recibo se a
  entrada já existir no cache (`if (!order) return order`). A transição terminal (`confirmed`/
  `declined`) chega **somente** por `order.updated` (socket) — a UI assina `keys.order.detail` e reflete
  (estado "confirmando" enquanto `status === "pending"`). **Recuperação:** para não perder um pedido
  pendente em refresh/reconexão, persistir o `orderId` da tentativa em voo (ex.: `localStorage`
  `nft-checkout:v1:pending-order`) **apenas o id, nunca dados de pedido**; ao montar o checkout, se há
  um pending-order salvo, `getOrder(orderId)` reconcilia o estado real (navega para `/order/$id` se já
  terminal). Na reconexão, `initRealtime` já faz `invalidateQueries({ type: "active" })` — o
  `keys.order.detail` ativo é refetchado. **Nunca** criar outro pedido para o mesmo carrinho sem nova
  ação explícita (o idempotencyKey + o pending-order id garantem isso).

- **A10 — Expiração de sessão: `redirect` preserva a rota; ao voltar, cotação/carrinho refazem.** O
  `requireAuth` já redireciona para `/login?redirect=/checkout` quando a sessão some no `beforeLoad`
  (refresh). Durante o fluxo (ex.: cenário `session-expired`), uma chamada protegida
  (`createQuote`/`createOrder`/`listWallets`) responde `401`; o interceptor 401 global faz teardown e
  zera a sessão. A UI do checkout, ao perceber sessão nula, navega para `/login?redirect=/checkout`
  (não finaliza, não fabrica). Ao reautenticar, o carrinho é mesclado/refetchado e a cotação refeita
  pela chave `keys.quote(cart.version, coupon)`. Nenhum pedido é criado durante a expiração.

## Telas e layout

### Desktop (`Desktop_Pagamento.md`)

- Breadcrumb "Início / Mercado / Pagamento" (`Color/Foreground`, `Body/15 Bold`).
- **Frame 327** em `row`, gap 32:
  - **Coluna esquerda — "Perfil do colecionador"** (`Body Large/17 Bold`): grade de campos (A3). Campos
    **funcionais** (bordas `Color/Border` radius 3): **Rede** (`Selecione uma rede` ▾), **Endereço da
    carteira** (read-only, `Endereço 0x da carteira`), **Tipo de carteira** (`Selecione uma carteira`
    ▾), **E-mail**/**Nome de exibição** (read-only, da sessão). Campos **decorativos** (A3): código de
    indicação, nome do perfil, ENS/.eth, observação — omitidos ou desabilitados sem persistência.
    Linha "Usar outra carteira?" (radio `Color/Primary`) → reabre a seleção de carteira.
  - **Coluna direita — "Seus NFTs"** (`Body Large/17 Bold`): cabeçalho "NFTs · Subtotal" + divisória
    `Color/Primary` (strokeWeight 0.3); cards `Color/Surface Card` radius 8 por item: artwork 70×70
    (`alt` = título), título (`Body Large/16 Bold`), "ID do token: #…" (`Color/Secondary`), "(x N)"
    (`Text/Secondary`) e total de linha (`Text/Accent`, `Body Large/18 Bold`). Abaixo: "Tem um código
    promocional? Aplique aqui" (A6, cupom espelha a `cart`), **Subtotal**, **Desconto do lançamento**
    `(-) 00.00`, **Taxa de rede** + legenda "Taxa estimada" (`Text/Accent`), divisória, **Total**
    (`Text/Accent`, `Body Large/18 Bold`). Depois o bloco **"Carteira e rede"** (`Body Large/17 Bold`):
    opções de carteira (radios `Color/Primary`; branding decorativo "METAMASK • WALLETCONNECT •
    COINBASE"), e o CTA **"Confirmar compra"** (`Color/Primary`, radius 8, texto `Color/Ink`).

### Mobile (`Mobile_Pagamento.md`)

- Cabeçalho com botão voltar (ellipse `Color/Surface Raised`) + título "Pagamento com carteira"
  (`Title/20 Bold`). Linha "Carteira conectada" (`Body Large/16 Bold`) + "Trocar carteira"
  (`Text/Accent`) — reflete o estado de conexão simulado (A4). Bloco "Carteira e rede"; resumo
  (Subtotal/Desconto/Taxa/"Total:") e CTA "Confirmar compra" fixo ao final.

> Estados não desenhados (carregando, erro de API, cotação obsoleta, carteira ausente, pedido
> confirmando, recusa/timeout) seguem a `foundation` (`ErrorState`/`EmptyState`/`LoadingState`,
> skeleton shimmer, toasts; §8). Preservar tipografia/cores/espaços/tokens nomeados do Figma. Quantidade
> exibida como "(x N)".

## Roteamento e navegação

- `/checkout` **já registrada** e privada (A1) — trocar só o `component` por `CheckoutScreen`.
- **`/order/$orderId`** registrada agora como placeholder privado (A2) e adicionada à `routeTree`.
- Pós-sucesso: `navigate({ to: "/order/$orderId", params: { orderId: order.id } })` (sem full reload,
  preserva o cache de `keys.order.detail` que a tela de confirmação lê).
- Se o carrinho estiver **vazio** ao abrir `/checkout` (ex.: acesso direto), `EmptyState` + `<Link
  to="/cart">`/`<Link to="/">` — não há o que cotar/comprar.
- Sessão ausente/expira (A10): `<Navigate>`/`navigate` para `/login?redirect=/checkout`.
- Navegação SPA para preservar o cache de `keys.cart`/`keys.quote`/`keys.order`.

## Dados, hooks e mutations

Consome **apenas** `@/contracts` + `@/lib/*`; nunca Axios/handlers direto; nunca redeclara shapes.
Hooks colados à feature em `src/features/checkout/`.

- **Carrinho:** reusa `useCart()` (`@/lib/cart/use-cart.ts`) → `keys.cart`/`getCart`. Fonte dos
  títulos/imagens do resumo e da `cart.version`.
- **Cotação:** reusa `useQuote(cart.version, itemCount, couponCode?)` (`@/lib/cart/use-quote.ts`)
  → `keys.quote(cartVersion, couponCode)`/`createQuote`. `retry: 0`; refetch automático quando a versão
  muda. A cotação é a **referência** para finalizar (§3).
- **Carteiras:** `useWallets()` (`src/features/checkout/use-wallets.ts`) → `useQuery({ queryKey:
  keys.wallets, queryFn: listWallets })`. Enabled quando autenticado.
- **Perfil (opcional, read-only):** nome/e-mail podem vir de `useSession()` (`user.displayName`/
  `user.email`); se precisar de mais, `getProfile`/`keys.profile`. Sem mutação de perfil aqui.
- **Criar pedido:** `useCreateOrder()` (`src/features/checkout/use-create-order.ts`) →
  `useMutation<Order, unknown, CreateOrderRequest>({ mutationFn: (body) => createOrder(body), retry: 0,
  onSuccess: (order) => queryClient.setQueryData(keys.order.detail(order.id), order) })`. O
  `onSuccess` **semeia** `keys.order.detail` (obrigatório p/ `order.updated` aplicar — A9). Padrão de
  `setQueryData` espelha `use-add-to-cart`. **Sem** otimismo (o pedido vem do servidor); o otimismo
  obrigatório da §4 já é cumprido por `use-toggle-favorite`.
- **Consulta de pedido (recuperação):** `useOrder(orderId)` (`src/features/checkout/use-order.ts`, ou
  deixar para `order-confirmation`) → `useQuery({ queryKey: keys.order.detail(orderId), queryFn: () =>
  getOrder(orderId), enabled: Boolean(orderId) })`. Usado para reconciliar pending-order no mount (A9).
- **`idempotencyKey`:** gerado no fluxo (A7), guardado em `ref`/estado; **não** é derivado do conteúdo —
  é um UUID por tentativa, reusado em retry da **mesma** tentativa.
- **ETH:** sempre string decimal; `formatEth` para exibir; `eqEth`/`mulEth` só via helpers de
  `@/contracts` value-types (sem aritmética ad-hoc).

## Validação e mapeamento de erros

Pré-condições de UI (não enviam request): carrinho não-vazio; carteira selecionada (`walletId`); rede
selecionada; `connection === "connected"`; cotação presente e **não** obsoleta (`isQuoteStale === false`).
Enquanto alguma falhar, o CTA fica desabilitado com motivo acessível.

**Erros/resultados de `createOrder` e `createQuote` (`HttpError.detail`, via `isApiCode` + leitura de
`detail.error.reason` quando `code === "conflict"`):**

| Cenário | `code` (status) / fonte | Tratamento na UI |
| --- | --- | --- |
| Cotação desatualizada (versão não bate ou preço de linha mudou) | `conflict` reason `price_changed` (409) | Bloqueia a confirmação; aviso acessível ("O preço mudou. Revise e confirme novamente."); **invalida/refaz** `keys.cart`+`keys.quote(cart.version, coupon)`; **renova o `idempotencyKey`** (nova tentativa) — não finaliza até o usuário reconfirmar (§7). |
| Edição esgotada durante a compra | `conflict` reason `availability` (409) | Aviso acessível ("Edição esgotada durante a compra."); refaz `keys.cart`/`keys.quote` (o item/quantidade pode ter mudado); orienta ajustar no carrinho; não finaliza. |
| Chave de idempotência reusada com conteúdo diferente | `conflict` reason `idempotency_mismatch` (409) | **Não deve ocorrer** em uso normal (o key é renovado ao mudar cotação/carteira/rede — A7). Se ocorrer (corrida), renovar o key e permitir nova confirmação; sem travar a UI. |
| Carteira inexistente | `not_found` resource `wallet` (404) | Revalidar `listWallets` (`invalidate`); se vazio, `EmptyState` → `/wallets`; sem finalizar. |
| NFT inexistente na revalidação | `not_found` resource `nft` (404) | Refaz `keys.cart`/`keys.quote` para reconciliar; aviso de item indisponível. |
| **Timeout após criar o pedido** (cenário `order-timeout`) | `network` (sem resposta) | O pedido **já existe** no servidor. A UI mostra "Finalizando… / não recebemos confirmação" e oferece **"Tentar novamente"** que reenvia `createOrder` **com o mesmo `idempotencyKey`** → replay recupera o mesmo pedido (sem duplicar). Alternativamente, se o `orderId` foi persistido (A9), `getOrder` reconcilia. **Sem** sucesso fabricado. |
| Falha transitória / rede na cotação ou na criação | `transient` (503) / `network` | `ErrorState`/aviso com **"Tentar novamente"** (ação explícita; reusa o key na criação). Mantém a tela e os valores já exibidos; nada confirmado sem resposta. |
| Sessão expirada durante o checkout | `unauthenticated` (401) | Navega para `/login?redirect=/checkout` (A10); não finaliza. O 401 global faz teardown idempotente. |
| Acesso não autorizado | `forbidden` (403) | `ErrorState` ("Sem permissão."); não finaliza. |

> **Sem dado fabricado no catch (eliminatório §11):** a confirmação só é exibida para pedido
> efetivamente `confirmed` **na simulação** (chega por `order.updated`). Enquanto `pending`, a UI mostra
> "confirmando", nunca "confirmado". Timeout/rede nunca aparentam sucesso.

## Tempo real (§7)

- A UI **só lê o cache**: nenhum `socket`, nenhum listener, nenhum `setQueryData` de evento nesta
  feature. A camada `@/lib/realtime` já aplica `nft.updated` em `keys.cart`/detalhe/listas e
  `order.updated` em `keys.order.detail` (dedupe por `version`, descarta antigos/duplicados).
- **Cenário crítico §7 (preço muda → bloqueia cotação desatualizada):** `nft.updated` patcheia o item em
  `keys.cart` (sem mexer em `cart.version`). `isQuoteStale(cart, quote)` passa a `true` (divergência de
  preço por linha). A UI: (a) aviso acessível `aria-live="polite"` ("O preço de um item mudou. Revise o
  resumo."); (b) **bloqueia** "Confirmar compra"; (c) exibe "Revisar e reconfirmar" que **refaz** a
  cotação (`keys.quote(cart.version, coupon)`) e **renova o `idempotencyKey`**. Só então a confirmação
  reabre. Mesmo que o usuário burle a UI, o servidor rejeita com `conflict(price_changed)` — defesa em
  profundidade.
- **Pedido pendente + queda/reconexão (§7):** com o pedido `pending`, uma interrupção de conexão não
  perde o estado — `keys.order.detail` fica em cache; na reconexão `initRealtime` reconcilia
  (`invalidateQueries({ type: "active" })`) e `order.updated` atualiza o estado terminal. Após refresh,
  o pending-order id persistido (A9) + `getOrder` recuperam o estado sem criar outra compra. Pedidos
  `confirmed`/`declined` são **terminais** — não regridem (dedupe por `version` garante).

## Acessibilidade (§8)

- Selects de rede/carteira: `<label>` associado, operáveis por teclado, foco visível (ring `primary`);
  opção selecionada não dependente só de cor (texto/ícone de check). Estado de conexão anunciado via
  `aria-live` ("Carteira conectada"/"Conexão recusada."/"Conectando…").
- CTA "Confirmar compra": `aria-busy` + desabilitado enquanto `isPending`/pedido `pending`; quando
  bloqueado por pré-condição (sem carteira, cotação obsoleta, não conectado), expor o **motivo** textual
  associado (`aria-describedby`) — não desabilitar silenciosamente.
- Avisos de cotação obsoleta/esgotado/timeout: `role="status"`/`role="alert"` conforme severidade,
  ligados por `aria-describedby`; feedback acessível de mutation (toast + estado).
- Resumo e "Seus NFTs" com **skeleton shimmer** preservando dimensões (sem layout shift); respeitar
  `prefers-reduced-motion` (já no `index.css`). Artworks com `alt` = título do NFT.
- Teclado 100%; responsivo 390/768/1440 sem overflow horizontal.

## Critérios de aceitação

1. `/checkout` renderiza `CheckoutScreen` fiel ao Figma (desktop duas colunas; mobile empilhado), com
   tokens nomeados; permanece **privada** (visitante → `/login?redirect=/checkout`).
2. "Seus NFTs", subtotal, desconto, taxa de rede e total vêm **só** da `Quote` (ETH string via
   `formatEth`); títulos/imagens casados do `Cart` por `nftId`; nenhuma aritmética de dinheiro ad-hoc;
   nenhum valor confirmado fabricado no catch.
3. Carteira/rede: lista `listWallets` real; seleção preenche endereço/tipo/rede read-only; **sem**
   carteira → `EmptyState` → `/wallets`. Conexão é estado local simulado (Conectar → Conectado →
   Trocar/Desconectar; recusa possível) **sem** fabricar dado persistente nem aparentar transação.
4. "Confirmar compra" só habilita com sessão + carteira + rede + conectado + cotação não-obsoleta; cria
   o pedido via `createOrder` com `idempotencyKey` gerado no fluxo; escreve o `Order` em
   `keys.order.detail` e navega para `/order/$id`.
5. **Idempotência**: clique duplo/repetido e retry após timeout/transiente reusam o **mesmo**
   `idempotencyKey` → mesmo pedido (replay 200), sem duplicar; o cenário `order-timeout` recupera o
   pedido existente.
6. **Cotação desatualizada (§7)**: `nft.updated` que muda o preço de um item do carrinho torna
   `isQuoteStale === true` → confirmação **bloqueada** + aviso + "Revisar e reconfirmar" (refaz cotação,
   renova key). O servidor também rejeita com `conflict(price_changed)` se forçado.
7. **Ciclo de vida**: pedido criado em `pending` mostra "confirmando"; `order.updated` confirmed/declined
   atualiza o estado (UI só lê o cache); confirmação só aparece para pedido efetivamente `confirmed`.
8. **Recuperação**: queda/reconexão com pedido pendente reconcilia via realtime; refresh recupera o
   pending-order (id persistido + `getOrder`) sem criar outra compra; pedidos terminais não regridem.
9. Expiração de sessão no checkout → `/login?redirect=/checkout`; ao voltar, carrinho/cotação refazem;
   nenhum pedido criado durante a expiração.
10. a11y: selects/CTA/avisos por teclado, foco visível, labels/erros associados, estado de conexão e
    mutations anunciados; skeleton shimmer sem layout shift; sem overflow em 390/768/1440.
11. `quote-stale.ts` movido para módulo compartilhado e `cart` reaponta o import (A8, requer aprovação);
    `/order/$orderId` registrada como placeholder privado (A2); ambas edições fora de
    `src/features/checkout/` documentadas em `ARCHITECTURE.md`.
12. `tsc`, `npm run lint`, `npm run test`, `npm run build` limpos; sem regressão (suíte da base verde).

## Verificação

- Dev: logar (`collector@example.com` / `password123` — tem 2 carteiras), montar carrinho na
  `nft-detail`, abrir `/cart` → "Conectar e finalizar" → `/checkout`. Selecionar carteira/rede,
  "Conectar carteira" → "Confirmar compra" → pedido `pending` → (cenário `payment-confirmed`) vira
  `confirmed` via socket e navega/mostra confirmação.
- Cenários do mock (`window.__mock` / `?scenario=`):
  - `payment-confirmed` → confirmação após `order.updated: confirmed`; `payment-declined` → recusa.
  - `order-timeout` → 1ª confirmação não retorna; "Tentar novamente" (mesmo key) recupera o mesmo
    pedido (sem duplicar); conferir que não há segundo `order-XXXX`.
  - `price-changed` → com item no carrinho, após ~4s o preço muda (`nft.updated`); checkout bloqueia a
    confirmação e pede revisão; reconfirmar refaz a cotação e finaliza.
  - `sold-out-during-purchase` → `conflict(availability)` ao confirmar; aviso + reconciliação.
  - `session-expired` → durante o checkout, chamada protegida 401 → redireciona a `/login?redirect=
    /checkout`; reautenticar retoma.
  - Usuário recém-cadastrado (sem carteira) → `EmptyState` → `/wallets`; não finaliza.
- Duplo-clique no CTA → uma única chamada / um único pedido.
- Reconexão: derrubar/retomar o socket com pedido pendente → estado reconcilia; refresh com pending →
  `getOrder` recupera sem nova compra.
- Teclado: operar selects/conexão/CTA; foco visível; sem overflow em 390/768/1440.
- Isolamento (§11): logar como `trader@example.com` não deve ver pedidos de `collector` (store isola por
  dono; `getOrder` de pedido alheio → `not_found`).

## Testabilidade (preparar p/ Playwright §9.6/§9.7/§9.9/§9.10)

- Roles/labels estáveis: região "Seus NFTs" (cada item com nome acessível = título do NFT), selects
  "Selecione uma rede"/"Selecione uma carteira", botão "Conectar carteira"/"Trocar carteira", linhas
  "Subtotal/Desconto do lançamento/Taxa de rede/Total", CTA "Confirmar compra", avisos de cotação
  obsoleta/esgotado/timeout (status/alert).
- Fluxos-alvo: **§9.6** (compra completa catálogo→recibo), **§9.7** (falha de pagamento, clique repetido,
  timeout com recuperação do mesmo pedido), **§9.9** (alteração de preço via Socket.IO durante o
  checkout → bloqueio), **§9.10** (eventos duplicados/antigos, desconexão e retomada de pedido pendente).
  Todos dirigíveis por cenário do mock + reset determinístico; eventos passam pelo cliente Socket.IO
  (nunca setters diretos na UI — §6/§11).
