# Spec — Feature `nft-detail` (Fase 4)

> Página de **detalhe do NFT** em `/nft/$idOrSlug` (README §3 "Catálogo e detalhe": acesso direto,
> NFT inexistente, edição indisponível, limite de quantidade; §5 "NFTs"; §7 "tempo real" —
> `nft.updated` em preço/disponibilidade; §8 UX/a11y; §9.2 fluxos E2E de detalhe). Consome a camada
> de dados da Fase 3 e os primitivos/rotas da `foundation` + `catalog` — não reimplementa tokens,
> header, estados, nem a rota (hoje `PlaceholderPage`, registrada pela `catalog` como esqueleto
> `/nft/$idOrSlug`; ver `router.tsx` e `catalog.spec.md` A8).
>
> Design: `design/components/Desktop_Detalhes_do_NFT.md` (galeria à esquerda + painel "Details" à
> direita) e `Mobile_Detalhes_do_NFT.md` (hero + "Details Sheet" + "Buy Bar" fixa). Dark, Roboto Mono.
> Tokens em `design/tokens.md`.

## Objetivo e fronteiras

**Entrega:**

1. A UI real da rota `/nft/$idOrSlug` (troca o `component` do esqueleto — **não** cria rota paralela).
2. Leitura do NFT via `getNft(idOrSlug)` com `keys.nft.detail(idOrSlug)`; estados de
   carregando / 404 (NFT inexistente) / erro / sucesso usando os primitivos de `@/components/state`.
3. Galeria/arte (imagem principal + thumbnails), metadados (título, coleção, criador, descrição,
   preço em ETH, edições disponíveis/total, atributos, id do token), **avaliações estáticas**.
4. **Seletor de quantidade** (inteiro, 1..`editionsAvailable`); esgotado (`editionsAvailable === 0`)
   desabilita compra com **estado textual** ("Esgotado"), não só cor (§8).
5. **Favoritar** (toggle otimista reusando `useToggleFavorite` de `@/lib/favorites`), gated por sessão.
6. **Adicionar ao carrinho** via `addCartItem` (hook colado à feature); pós-sucesso: toast + link
   para `/cart`. **Comprar**: adiciona ao carrinho e navega para `/cart` (fluxo de compra começa lá).
7. Preço/edições refletem **sozinhos** por `nft.updated` (a camada de dados já patcheia
   `keys.nft.detail`); a UI só lê o cache.

**Fora de escopo (não podem aparentar sucesso — §3/§11):**

- Carrinho e checkout em si (feições `cart`/`checkout`, próximas). Esta feature só **empurra** itens
  pro carrinho e navega; não renderiza o carrinho nem cotação.
- "Mais desta coleção" (relacionados), carrossel, avaliações dinâmicas, compartilhar
  (LinkedIn/Twitter), newsletter do footer. Renderizados conforme o Figma **se baratos**, porém
  **estáticos/decorativos** e anunciados como não-funcionais — ou simplesmente omitidos (A9). Nenhum
  deles pode simular uma ação bem-sucedida.
- Avaliações ("19 avaliações de colecionadores", estrelas, "4.8"): **não há contrato** — exibidas
  como enfeite estático (A8), sem fabricar número por NFT.
- `nft.updated` via socket: a UI **não** se inscreve nem escreve no cache de realtime; só lê.

## Decisões

- **A1 — Troca o `component` da rota existente.** A `catalog` já registrou `/nft/$idOrSlug`
  (`path: "/nft/$idOrSlug"`, sem `validateSearch`). A feature só substitui o `component` por
  `NftDetailScreen` e lê o param com `Route.useParams()` / `useParams({ from: "/nft/$idOrSlug" })`.
  Rota **pública** (detalhe é navegável sem login, como no catálogo); ações que exigem sessão são
  gated dentro da tela (A5).
- **A2 — `getNft` aceita id OU slug.** `getNft(idOrSlug: string)` (em `@/lib/http/api`) faz
  `GET /nfts/${encodeURIComponent(idOrSlug)}`; o contrato `getNftParamsSchema` declara "aceita id ou
  slug (acesso direto)". Os cards do catálogo linkam com `params={{ idOrSlug: nft.slug }}` (ver
  `nft-card.tsx`). A feature passa o param **cru** da URL para `getNft` e para `keys.nft.detail` —
  não normaliza id↔slug no cliente (o backend resolve). Consequência: id e slug geram entradas de
  cache distintas; é aceitável (o realtime `onNftUpdated` patcheia **todas** as entradas de detalhe
  cujo `data.id` bate — ver `apply-events.ts`, `setQueriesData` com predicate).
- **A3 — Hook de leitura colado à feature.** `useNftDetail(idOrSlug)` em
  `src/features/nft-detail/use-nft-detail.ts`, espelhando `use-nft-list.ts`:
  `useQuery({ queryKey: keys.nft.detail(idOrSlug), queryFn: () => getNft(idOrSlug) })`. Sem
  `useState` de dados; a `version`/preço/edições vêm sempre do cache.
- **A4 — Quantidade é estado local de UI, limitada por `editionsAvailable`.** Inteiro em
  `[1, max]`, `max = editionsAvailable` (`StockQuantity`, pode ser 0). Clamp no incremento/decremento
  e ao digitar; quando `editionsAvailable === 0`, o seletor fica desabilitado e a quantidade some do
  payload (não há o que comprar). **Sem** aritmética de dinheiro aqui — quantidade é inteiro puro; o
  preço de linha, se exibido, usa `mulEth(nft.priceEth, qty)` de `@/contracts` (value-types), nunca
  `Number(price) * qty`.
- **A5 — Ações que exigem sessão redirecionam ao login preservando contexto.** Favoritar e
  adicionar/comprar exigem auth (favoritos/carrinho são por usuário no backend). Lê
  `useSession()` (`@/lib/auth/use-session`). Sem sessão: o clique **não** chama a API — navega para
  `/login` com `redirect` igual à rota atual do detalhe (via `location.href`/`Link search`), casando
  com o contrato de `redirect` da `foundation`/`auth`. Isso evita um 401 que dispararia o fluxo de
  expiração global sem intenção do usuário.
- **A6 — Favoritar reusa `useToggleFavorite` (`@/lib/favorites`) — não redeclara.** O estado
  "favoritado?" vem de `keys.favorites` (array `nftIds`): a UI lê o cache de favoritos (quando houver
  sessão) para refletir o toggle otimista. Como **nenhuma** feature ainda popula `keys.favorites` por
  uma query (`getFavorites` existe mas não é consumido), este hook adiciona `useFavoritesStatus(nftId)`
  colado à feature: `useQuery({ queryKey: keys.favorites, queryFn: getFavorites, enabled: isAuthenticated })`
  e deriva `isFavorited = data?.nftIds.includes(nft.id) ?? false`. O toggle em si continua via
  `useToggleFavorite()` (otimista + rollback + reconciliação já prontos). Botão com `aria-pressed`.
- **A7 — Adicionar/Comprar: mutation colada à feature, sem depender da tela de `cart`.**
  `useAddToCart()` em `src/features/nft-detail/use-add-to-cart.ts`:
  `useMutation({ mutationFn: (body: AddCartItemRequest) => addCartItem(body), retry: 0 })`, com
  `onSuccess` escrevendo o `Cart` retornado em `keys.cart` (`setQueryData`) — isso já faz o badge do
  header (que lê `keys.cart` do cache, ver SESSION_CONTEXT) refletir, independente de `cart` existir.
  **Adicionar ao carrinho:** toast de sucesso com ação/link "Ver carrinho" → `/cart`; permanece na
  página. **Comprar:** mesma mutation; no `onSuccess` navega para `/cart`. Nenhum dado fabricado: o
  carrinho exibido vem do `Cart` real do handler.
- **A8 — Avaliações são decorativas (sem contrato).** Estrelas/"19 avaliações"/"4.8" não existem em
  `nftSchema`. Exibidas como enfeite estático **ou** omitidas; nunca derivadas por NFT de forma a
  parecer dado real. Preferência: omitir no MVP para não sugerir métrica inexistente (§11).
- **A9 — Seções não-funcionais do Figma.** "Mais desta coleção"/carrossel, compartilhar, newsletter:
  omitidas no MVP (ou renderizadas estáticas com indicação acessível de indisponibilidade). A galeria
  de thumbnails usa a **única** imagem real (`nft.imageUrl`); o Figma mostra 4 miniaturas, mas o
  contrato tem uma `imageUrl` — renderizar a arte real como principal e **não** inventar múltiplas
  imagens (thumbnails ou somem, ou repetem a mesma marcada como ativa, sem fingir variações).
- **A10 — `?scenario=` / `window.__mock` não é responsabilidade da UI.** A feature só precisa que os
  cenários do mock existam (404 de NFT, esgotado, `nft.updated`, conflito de disponibilidade no
  add-to-cart). A UI reage ao que a camada de dados devolve.

## Telas e layout

### Breadcrumb/cabeçalho
- Header global vem do shell (não reimplementar). Breadcrumb "Início / Mercado" (Figma Desktop
  `Main`) → link "Início" para `/` + rótulo atual. Mobile: botão **Voltar** (seta) → histórico/`/`.

### Galeria (Desktop: `Product Images`; Mobile: hero)
- **Imagem principal** em card `surface-card`, `rounded` (tokens: fill `Color/Surface Card` #241612,
  radius do card 6, arte interna radius 24). `src = nft.imageUrl`, `alt = nft.title`.
- **Thumbnails** (coluna, gap 16): no MVP, a única arte real (A9). Thumbnail ativa com borda
  `Color/Primary`. Zoom/expand (`Frame 399`) é decorativo/omitido.
- Skeleton com as mesmas dimensões (sem layout shift, §8/README §8), respeitando reduced-motion.

### Painel de detalhes (Desktop: `Details`; Mobile: `Details Sheet` + `Buy Bar`)
- **Título** `nft.title` (`Heading/28 Bold` desktop; `Title/20 Bold` mobile), `Color/Foreground`.
- **Preço** `formatEth(nft.priceEth)` + " ETH" em `Text/Accent` (#E89B55), `Title/22 Bold`.
- **Avaliações**: decorativo/omitido (A8).
- Divisor `Color/Primary` fino.
- **"Sobre este NFT:"** (`Body/15 Bold`) + `nft.description` (`Body/14 Regular lh24`,
  `Text/Secondary`).
- **"Edição:"** — chips de edições. No Figma são presets (1/1, 1/10, 1/50, ABERTA); sem contrato pra
  "tiers", exibir **"Edições: {editionsAvailable} de {editionsTotal} disponíveis"** como texto fiel
  aos números reais (A4), com o chip ativo estilizado em `Primary`/`Accent`. Estado **esgotado**
  (`editionsAvailable === 0`) mostra selo textual "Esgotado".
- **Seletor de quantidade** ("Qtd." no mobile `Buy Bar`): botões `−`/`+` (círculos `Primary`,
  radius 33/20) + número (`Title/20`); `−` desabilita em 1, `+` desabilita em `editionsAvailable`.
  Input numérico acessível (A4). Desabilitado inteiro quando esgotado.
- **Ações**:
  - **COMPRAR** / **Comprar NFT** (botão primary `Color/Primary`, texto `Color/Ink`): A7. Desabilitado
    quando esgotado (`disabled` + texto "Esgotado"), em loading (`aria-busy`) durante a mutation.
  - **Favoritar** (botão outline `Primary`, ícone coração): A6. `aria-pressed` reflete estado; ícone
    preenchido (`Text/Accent`) quando favoritado.
- **Metadados secundários** (`Frame 164/166`): "ID do token: #…" (derivar de `nft.id`/`attributes` se
  houver; caso contrário **não** inventar — mostrar `nft.id` real), "Coleção: {nft.collection}",
  "Criador: {nft.creator}", "Atributos: {nft.attributes.map(a => a.value).join(", ")}". Compartilhar
  omitido/decorativo (A9).
- Bloco "Detalhes do NFT" / "Rede" / "Contrato" / "Direitos autorais" (Desktop `Description`): só
  renderizar campos que existam no contrato; textos de "Rede: Ethereum"/"Contrato: 0x…" são **cópia
  estática de marketing** (não há campo), exibidos como texto fixo genérico **ou** omitidos — nunca
  apresentados como dado específico daquele token (§11). Preferência: omitir os que exigiriam valor
  por-token inexistente.

> Estados não desenhados (erro de API, carregando, 404) seguem os primitivos da foundation
> (`LoadingState`/`ErrorState`/`EmptyState`). Preservar tokens nomeados (não hex cru).

## Roteamento e navegação

- **Param:** `Route.useParams()` → `{ idOrSlug }`. Passado cru a `useNftDetail` e `keys.nft.detail`.
- **Sem `validateSearch`:** o detalhe não tem estado de busca/filtro/ordenação/paginação na URL
  (diferente do catálogo). Não adicionar search params.
- **Links internos tipados** (`@tanstack/react-router` `Link`): "Início" → `/`; "Ver carrinho" /
  pós-compra → `/cart`; login gated → `/login` com `search={{ redirect: <href atual> }}`.
- **Pós-adicionar:** permanece em `/nft/$idOrSlug`, toast com ação → `/cart`.
- **Pós-comprar:** `navigate({ to: "/cart" })` após `onSuccess`.

## Dados, hooks e mutations

Consome **apenas** `@/contracts` + `@/lib/*` (nunca Axios/handlers direto; nunca redeclara shapes).

- **Leitura:** `useNftDetail(idOrSlug)` → `useQuery(keys.nft.detail(idOrSlug), () => getNft(idOrSlug))`
  (A3). Estados: `isPending` → skeleton; `isError` → `ErrorState` (ou 404, abaixo); `data` → conteúdo.
- **Realtime (§7):** **nenhum** código de socket. `onNftUpdated` (camada de dados) já faz
  `setQueriesData` em `["nft","detail", …]` com dedupe por `version`; a UI, assinando a query, recebe
  preço/edições novos automaticamente. Se a quantidade selecionada ficar acima do novo
  `editionsAvailable`, **clampar** na próxima renderização (A4) para não enviar quantidade inválida.
- **Favoritos:** `useFavoritesStatus(nft.id)` (leitura, A6) + `useToggleFavorite()` (toggle otimista,
  `@/lib/favorites`, reuso direto — referência do padrão otimista+rollback). Gating por sessão (A5).
- **Carrinho:** `useAddToCart()` (A7) chamando `addCartItem({ nftId, quantity })` com
  `quantity = parseQuantity(selected)` (`@/contracts` value-types) e `nftId = nft.id`. `retry: 0`.
  `onSuccess` → `setQueryData(keys.cart, cart)` (badge do header reflete via cache). Sem otimismo no
  carrinho (a resposta é a verdade; evita divergir da versão/estoque do servidor).
- **ETH:** `formatEth(nft.priceEth)` para exibir; `mulEth`/value-types para qualquer total. Nunca
  `parseFloat`/aritmética de dinheiro na UI (ETH é `EthAmount` string decimal).

## Validação e mapeamento de erros

Via `isApiCode(HttpError.detail, …)` / `resolveApiRequestError` (`@/lib/http/errors`,
`@/components/state`). **Sem dado fabricado no catch** (eliminatório §11).

### Leitura do NFT (`getNft`)

| Cenário | `code` (status) | Tratamento na UI |
| --- | --- | --- |
| NFT inexistente | `not_found` (404) | Estado dedicado de **"NFT não encontrado"** (`EmptyState`/`ErrorState` com título próprio) + link "Voltar ao catálogo" (`/`). **Não** usar `notFoundComponent` da rota (o erro vem da query, não do router). |
| Falha transitória / rede | `transient` (503) / `network` | `ErrorState` com retry (`onRetry={() => refetch()}`), `isRetryable` já cobre. |
| Outro erro de API | demais `code` | `ErrorState` com a mensagem do contrato; sem retry salvo retryable. |

### Adicionar/Comprar (`addCartItem`)

| Cenário | `code` (status) | Tratamento na UI |
| --- | --- | --- |
| Edição indisponível / estoque insuficiente | `conflict` reason `availability` (409) | Toast de erro ("Edição indisponível — a disponibilidade mudou."); a query de detalhe é a fonte do novo estoque (realtime/refetch). **Sem** navegar nem fingir item no carrinho. |
| Sessão ausente/expirada | `unauthenticated` (401) | Não deveria ocorrer (gating A5 intercepta antes); se ocorrer, o interceptor global trata expiração; a UI mostra toast neutro sem fabricar sucesso. |
| Validação do servidor | `validation` (400) | Toast de erro com a mensagem do contrato (ex.: quantidade inválida). |
| Falha transitória / rede | `transient` (503) / `network` | Toast de erro + botão volta ao estado normal (permite nova tentativa). **Sem** dado fabricado. |

> O botão não fica "preso" em loading: `onSettled`/estado da mutation reseta. Em erro, nada é escrito
> em `keys.cart`.

## Tempo real (§7)

- A UI **só lê o cache** de `keys.nft.detail`; `nft.updated` (preço/`editionsAvailable`) é aplicado
  pela camada de dados com dedupe por `version` (`apply-events.ts` compara e descarta versões ≤ a
  última aplicada por recurso). Preço e disponibilidade do detalhe refletem sozinhos.
- **Consequência na quantidade:** se `editionsAvailable` cair abaixo da quantidade selecionada, a UI
  reclampa (A4). Se zerar, compra desabilita com selo "Esgotado" sem recarregar a página.
- Nenhuma assinatura de socket, nenhum `setQueryData` de evento nesta feature.

## Acessibilidade (§8)

- Imagem principal com `alt` = título; thumbnails decorativas com `alt=""`/`aria-hidden` se repetirem
  a mesma arte (A9).
- **Seletor de quantidade:** `−`/`+` são `<button>` com `aria-label` ("Diminuir quantidade" /
  "Aumentar quantidade"); valor em `<input type="number">`/`role="spinbutton"` com `<label>` "Qtd.",
  `aria-valuemin=1`, `aria-valuemax=editionsAvailable`. Desabilitados comunicam estado (não só cor).
- **Favoritar:** `<button>` com `aria-pressed` + `aria-label` ("Favoritar" / "Remover dos favoritos");
  foco não some ao alternar.
- **Esgotado:** texto "Esgotado" além da cor; botão Comprar `disabled` + `aria-disabled`.
- **Loading da compra:** `aria-busy`, desabilitado, sem perder contexto; toasts via sonner (shell).
- Estados (loading/erro/404) com `role="status"`/`role="alert"` (já nos primitivos de
  `@/components/state`).
- Navegação 100% por teclado; foco visível (ring `primary`); responsivo 390/768/1440 sem overflow
  (desktop: galeria + painel lado a lado; mobile: hero + sheet + buy bar fixa inferior).
- Respeitar `prefers-reduced-motion` em shimmer/transições (README §8).

## Critérios de aceitação

1. `/nft/$idOrSlug` renderiza o detalhe fiel ao Figma (desktop galeria+painel; mobile hero+sheet+buy
   bar), com tokens nomeados, trocando o `component` da rota existente (sem rota paralela).
2. Acesso direto por **id e por slug** carrega o NFT (`getNft` + `keys.nft.detail`); skeleton no
   carregamento, sem layout shift.
3. NFT inexistente (`not_found` 404) mostra estado dedicado "NFT não encontrado" com link ao catálogo
   — sem fabricar dado e sem tela de erro genérica do router.
4. Falha transitória/rede na leitura mostra `ErrorState` com retry funcional.
5. Preço e `editionsAvailable` refletem `nft.updated` sem recarregar; quantidade reclampada quando o
   estoque cai; esgotado desabilita compra com selo textual "Esgotado".
6. Seletor de quantidade respeita `[1, editionsAvailable]` (inteiro), teclado-acessível.
7. Favoritar reflete na hora (otimista via `useToggleFavorite`) e reconcilia com o servidor; sem
   sessão, redireciona para `/login?redirect=…` sem chamar a API.
8. "Adicionar ao carrinho" chama `addCartItem({ nftId, quantity })`, atualiza `keys.cart` (badge do
   header), mostra toast com link "Ver carrinho"; "Comprar" faz o mesmo e navega para `/cart`.
9. Conflito de disponibilidade (409 `availability`) no add-to-cart exibe erro sem escrever carrinho
   nem navegar; estoque atualizado vem da query.
10. ETH exibido via `formatEth`; qualquer total via value-types — sem aritmética de dinheiro na UI.
11. Seções sem contrato (avaliações, relacionados, compartilhar, rede/contrato por-token) omitidas ou
    estáticas/decorativas, nunca simulando dado real ou sucesso (§3/§11).
12. a11y: quantidade, favoritar e comprar operáveis por teclado, com labels/estados associados;
    responsivo 390/768/1440 sem overflow.
13. `tsc`, `npm run lint`, `npm run test`, `npm run build` limpos; sem regressão.

## Verificação

- Dev: navegar do catálogo (card → `/nft/<slug>`) e por URL direta com **id** e com **slug**.
- Cenários do mock (`window.__mock` / `?scenario=`): NFT inexistente → estado 404 dedicado; NFT
  esgotado (`editionsAvailable === 0`) → compra desabilitada com "Esgotado"; `nft.updated` baixando
  preço/estoque → detalhe reflete sozinho e quantidade reclampa; `addCartItem` com conflito de
  disponibilidade → toast de erro sem carrinho fantasma; cenário transitório/rede → `ErrorState`/toast
  com nova tentativa.
- Sessão: deslogado, clicar Favoritar/Comprar → vai a `/login?redirect=/nft/…`; após logar, retorna.
- Badge do header: após "Adicionar ao carrinho", a contagem reflete (lê `keys.cart` do cache).
- Teclado: `−`/`+`/input de quantidade, Favoritar (`aria-pressed`), Comprar (`aria-busy`), links.
- Responsivo 390/768/1440: sheet/buy bar no mobile, galeria+painel no desktop, sem overflow.

## Testabilidade (preparar p/ Playwright §9.2)

- Roles/labels estáveis: nome acessível da página (título do NFT como `<h1>`), botões
  "Favoritar"/"Comprar"/"Adicionar ao carrinho" por `role="button"` + nome; seletor de quantidade por
  `role="spinbutton"`/label "Qtd."; estado "Esgotado" como texto selacionável; `data-testid` opcional
  em blocos-chave (ex.: `nft-detail`, `buy-button`) espelhando o padrão do `nft-card`.
- Fluxos-alvo do §9.2: **acesso direto ao detalhe** (id e slug), **recurso inexistente**,
  **edição indisponível** (esgotado + conflito de disponibilidade) e **limite de quantidade** —
  todos dirigíveis por cenário do mock.
