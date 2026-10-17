# Spec — Camada de dados (Fase 3)

> Spec consolidada da fase. Cobre `lib/http`, `lib/query` e `lib/realtime` juntos porque são
> fortemente acoplados: o token resolvido pelo http alimenta o handshake do realtime; os eventos do
> realtime escrevem no cache do query; a troca/expiração de sessão dispara teardown nos três. Mesma
> abordagem de spec-única-por-fase usada na Fase 2 (`mock.spec.md`).

## Objetivo

Construir a **camada de dados do cliente** sobre a rede simulada da Fase 2 (REST sob `/api` + socket
em `SOCKET_LINK`), reutilizando os contratos da Fase 1 (`@/contracts`) como fonte única de formato.
Entrega:

1. **`lib/http`** — instância Axios (`baseURL: /api`) com interceptors de token e de erro; um
   **token store** (memória + `localStorage`) que sobrevive a refresh; **funções de API tipadas por
   endpoint** que chamam a rede e **validam a resposta** com os schemas Zod.
2. **`lib/query`** — `QueryClient` refinado, **query-key factory** tipada por recurso e **política de
   retry por `code`** (não retenta 4xx de contrato; retenta `transient`/falha de rede).
3. **`lib/realtime`** — wrapper `socket.io-client`: conexão à URL lógica, **handshake `auth`** por
   token, listeners `nft.updated`/`order.updated` validados, **dedupe por `version`**, aplicação do
   payload no cache, **reconciliação** pós-reconexão e **teardown** no logout/troca de usuário.
4. **Favoritos** — hook de toggle com **atualização otimista + rollback** (§4), como **referência** do
   padrão a ser reusado pela UI na Fase 4.

**Fora de escopo** (Fase 4): componentes, rotas, hooks de `useQuery`/`useMutation` por recurso (exceto
o de favoritos, que entra como referência). Esta fase não renderiza UI — só a ponte transporte↔estado.

## Princípios aplicados aqui

- **Contratos como validação de borda**: toda resposta REST e todo evento socket são parseados pelo
  schema Zod de `@/contracts` antes de entrar no cache. Sem tipos redeclarados.
- **`version` por recurso é a lei da ordem**: o cliente guarda a última `version` aplicada por recurso
  e **descarta eventos com `version <= última`** (idempotente, tolerante a duplicata/fora de ordem, §7).
- **Isolamento por usuário (eliminatório §11)**: logout/troca de usuário faz `socket.disconnect()`,
  remove listeners e `queryClient.clear()` — nenhum dado de um usuário vaza para a sessão seguinte.
- **Nada de resposta fictícia no cliente (eliminatório §11)**: o cliente nunca fabrica dados; só
  consome a rede (MSW) e o socket. Falhas vêm dos cenários, não de `catch` que inventa sucesso.
- **ETH permanece string decimal**: o cliente não faz aritmética de dinheiro; exibe/encaminha as
  strings dos contratos. Comparações usam os helpers de `value-types` quando necessário.
- **MSW ativo também em produção** (Fase 0): o cliente aponta para `/api` e `SOCKET_LINK` sempre.

## Decisões de design (a aprovar)

Base nas respostas já dadas pelo usuário (2026-10-17): **escopo = infra + funções de API + favoritos**;
**realtime = aplica payload com dedupe por `version`** (invalidação só como fallback na reconciliação).

- **#1 — Sessão como fonte de verdade.** A sessão vive numa query (`keys.session`) alimentada por
  `GET /api/auth/session`. O **token** é espelhado em `localStorage` (`nft-auth:v1:token`) **e** numa
  variável em memória lida pelo interceptor do Axios e pelo handshake do socket. No boot, se há token
  salvo, a query de sessão o revalida; token inválido/expirado → `resolveUser` do mock devolve
  `null` → `getSession` responde `null` → cliente limpa o token. (Atende "recuperação pós-refresh".)
- **#2 — 401/sessão expirada.** Resposta `unauthenticated` (401) → o interceptor **não** tenta refresh
  (não há endpoint de refresh no mock): limpa o token, invalida `keys.session` e deixa o erro tipado
  subir. A UI (Fase 4) reage à sessão nula redirecionando ao login. **Sem retry** em 401.
- **#3 — Normalização de erro.** O interceptor converte qualquer falha num erro tipado único,
  `ApiRequestError`, com discriminador: `{ kind: "api", error: ApiError }` (corpo validado por
  `apiErrorSchema`) **ou** `{ kind: "network" }` (sem resposta: `HttpResponse.error()` do cenário de
  timeout/queda). Isso dá à UI um shape estável para loading/vazio/erro/sucesso.
- **#4 — Retry por `code`.** `retry` do QueryClient: **nunca** retenta `validation`/`unauthenticated`/
  `forbidden`/`not_found`/`conflict`; retenta **1x** `transient` e **1x** falha de rede. Mutations:
  `retry: 0` (idempotência de pedido é responsabilidade do fluxo de checkout, via `idempotencyKey`,
  não de retry cego).
- **#5 — Aplicação de evento no cache.**
  - `nft.updated`: faz `setQueryData` no detalhe do NFT (`keys.nft.detail(id)`) aplicando
    `priceEth`/`editionsAvailable` + a nova `version`; atualiza o item onde aparecer em páginas de
    catálogo em cache (`keys.nft.lists()`) e no carrinho (`keys.cart`), respeitando o dedupe. Sem GET.
  - `order.updated`: `setQueryData` no pedido (`keys.order.detail(id)`) com `status`/`txRef` + `version`.
  - Dedupe: `Map<resourceKey, version>`; evento com `version <=` registrada é **descartado** e logado
    (dev). O `resourceKey` é `"nft:<id>"` / `"order:<id>"`.
- **#6 — Reconciliação pós-reconexão.** No evento `reconnect` do socket, reemite o handshake `auth` e
  **invalida as queries ativas** (`queryClient.invalidateQueries`) — cobre eventos perdidos durante a
  queda. O dedupe por `version` evita regressão quando o refetch e um evento chegam juntos.
- **#7 — Teardown.** `teardownUserData()` central: `socket.disconnect()`, limpa o mapa de versões,
  remove listeners e `queryClient.clear()`. Chamado no logout e na troca de usuário (login com outro
  id). O realtime reconecta e refaz o handshake com o novo token.
- **#8 — Transporte.** O socket força `transports: ["websocket"]` e `path: SOCKET_PATH` (o MSW não
  intercepta long-polling). `autoConnect: false`; conecta explicitamente após o boot da sessão.

## Estrutura de pastas (nova)

```
src/lib/
  http/
    client.ts            instância Axios + interceptors (token, normalização de erro)
    token-store.ts       token em memória + espelho em localStorage; getToken/setToken/clearToken
    errors.ts            ApiRequestError (união api|network); toApiRequestError(axiosError)
    api.ts               funções tipadas por endpoint (validam resposta com Zod)
  query/
    query-client.ts      (refina o existente: retry por code)
    keys.ts              query-key factory tipada
    retry.ts             shouldRetry(failureCount, error) por code
  realtime/
    socket.ts            wrapper socket.io-client (connect/disconnect/handshake/reconnect)
    apply-events.ts      aplicação de nft.updated/order.updated no cache + dedupe por version
    index.ts             API pública: initRealtime/teardownUserData/connectWithToken
  auth/
    session.ts           boot da sessão (revalida token salvo) + login/logout orquestrando token+realtime+teardown
  favorites/
    use-toggle-favorite.ts   mutation otimista + rollback (referência §4)
```

> Nota: optei por **uma** spec (`src/lib/data.spec.md`) em vez dos `http.spec.md`/`realtime.spec.md`
> separados que o plano previa, pelo acoplamento descrito no topo. Se preferir specs separadas, aviso.

## `lib/http`

### `token-store.ts`
- `getToken(): string | null` — memória; na 1ª leitura hidrata de `localStorage`.
- `setToken(token: string)` / `clearToken()` — atualiza memória e `localStorage` (`nft-auth:v1:token`).
- Sem React; é lido pelo interceptor e pelo handshake do socket (fora do ciclo de render).

### `client.ts`
- `axios.create({ baseURL: API_BASE })` onde `API_BASE = "/api"` (casa com `_helpers.API`).
- **Request interceptor**: se há token, injeta `Authorization: Bearer <token>`.
- **Response interceptor**: sucesso passa direto; erro → `toApiRequestError` e **rejeita** com
  `ApiRequestError`. Se `error.kind === "api" && error.error.code === "unauthenticated"`:
  `clearToken()` + marca a sessão como expirada (a `session.ts` invalida `keys.session`).
- Timeout do Axios configurado alto o suficiente p/ não competir com a latência dos cenários (os
  cenários controlam o tempo; o timeout "real" do cliente só captura a **queda** `HttpResponse.error`).

### `errors.ts`
```ts
type ApiRequestError =
  | { kind: "api"; status: number; error: ApiError }   // corpo validado por apiErrorSchema
  | { kind: "network" };                                 // sem resposta (queda/timeout de conexão)
```
- `toApiRequestError(e: unknown): ApiRequestError` — se `AxiosError` com `response`, valida o corpo
  com `apiErrorSchema`; se não casar, trata como `transient` genérico. Sem `response` → `network`.
- Helper `isApiCode(err, code)` p/ a UI/testes discriminarem sem repetir shape.

### `api.ts` — funções por endpoint (todas validam a resposta com Zod)
Espelham os handlers da Fase 2 (base `/api`):
- Sessão: `register`, `login`, `getSession`, `logout`.
- NFTs: `listNfts(query)`, `getNft(idOrSlug)`.
- Favoritos: `getFavorites`, `toggleFavorite(nftId)`.
- Carrinho: `getCart`, `addCartItem`, `updateCartItem`, `removeCartItem`.
- Cotação: `createQuote(req)`.
- Pedidos: `createOrder(req)`, `getOrder(orderId)`.
- Perfil: `getProfile`, `updateProfile`, `updateAvatar`, `changePassword`.
- Carteiras: `listWallets`, `createWallet`, `updateWallet`.

Cada função: monta a request, e no sucesso faz `schema.parse(data)` do contrato correspondente
(ex.: `nftPageSchema`, `cartSchema`, `quoteSchema`, `orderSchema`, `favoritesSchema`, `sessionSchema`).
`login`/`register` chamam `setToken(session.token)` após validar. `logout` chama `clearToken()`.

## `lib/query`

### `keys.ts` — factory tipada
```
keys.session                     ["session"]
keys.nft.all                     ["nft"]
keys.nft.lists()                 ["nft","list"]
keys.nft.list(query)             ["nft","list", normalized(query)]
keys.nft.detail(idOrSlug)        ["nft","detail", idOrSlug]
keys.favorites                   ["favorites"]
keys.cart                        ["cart"]
keys.quote(cartVersion,coupon?)  ["quote", cartVersion, coupon ?? null]
keys.order.detail(orderId)       ["order","detail", orderId]
keys.profile                     ["profile"]
keys.wallets                     ["wallets"]
```
`normalized(query)` serializa filtros/sort/paginação de forma estável (ordem de chaves fixa) p/ o
cache casar com o estado da URL da Fase 4.

### `retry.ts`
`shouldRetry(failureCount, error)`:
- `error.kind === "network"` → retenta enquanto `failureCount < 1`.
- `error.kind === "api"` e `code === "transient"` → idem (`< 1`).
- qualquer outro `code` (4xx de contrato) → **não** retenta.
- Aplicado em `defaultOptions.queries.retry`. `mutations.retry = 0` (mantém).

## `lib/realtime`

### `socket.ts`
- `createSocket()` → `io(SOCKET_URL, { path: SOCKET_PATH, transports: ["websocket"], autoConnect: false })`.
- `connectWithToken(token)` — seta auth e `connect()`; no `"connect"` emite `socket.emit("auth", token)`.
- `io.on("reconnect")` → reemite `auth` + reconcilia (invalida queries ativas); no-op sem token.
- `disconnect()` — desconecta. Os listeners vivem com o **socket-singleton** (um por app): em
  `socket.io-client@4`, `disconnect()` não remove `.on`; não os reempilhamos (ver `initRealtime`
  idempotente), então não há duplicação. O teardown desconecta e zera o estado de sessão/versões.

### `apply-events.ts`
- Mapa de versões `Map<string,number>`; `seen(resourceKey, version)` retorna `false` e registra se é
  nova, `true` se deve descartar.
- `onNftUpdated(raw)`: `nftUpdatedEventSchema.parse(raw)`; se não-dedupe, aplica em detalhe + listas +
  carrinho em cache.
- `onOrderUpdated(raw)`: `orderUpdatedEventSchema.parse(raw)`; se não-dedupe, aplica em `order.detail`.
- `clearVersions()` usado no teardown.

### `index.ts` — API pública
- `initRealtime(queryClient)` — registra os handlers de evento (uma vez).
- `connectRealtime(token)` — conecta/reconecta com o token atual.
- `teardownUserData()` — `disconnect()` + `clearVersions()` + `queryClient.clear()`.

## `lib/auth/session.ts` (orquestração)
- `bootSession()` — se há token salvo, dispara `getSession`; conecta o realtime se a sessão existir.
- `signIn(login)` / `signUp(register)` — chama a API, `setToken`, invalida `keys.session`, (re)conecta
  realtime com o novo token; se trocou de usuário, `teardownUserData()` antes.
- `signOut()` — `logout()` na API, `teardownUserData()`, `clearToken()`, invalida `keys.session`.

## Favoritos — referência do padrão otimista (§4)
`use-toggle-favorite.ts`:
- `useMutation` sobre `toggleFavorite(nftId)`.
- `onMutate`: `cancelQueries(keys.favorites)`; snapshot do valor atual; aplica o toggle otimista no
  cache (adiciona/remove `nftId`, **sem** mexer em `version`, que só o servidor incrementa).
- `onError`: **rollback** para o snapshot.
- `onSuccess`: substitui pelo `Favorites` retornado (com a `version` real).
- `onSettled`: `invalidateQueries(keys.favorites)`.

## Testes (Vitest, sem navegador)
- **http/errors**: `toApiRequestError` mapeia AxiosError com corpo `ApiError` → `kind:"api"`; sem
  response → `kind:"network"`; corpo inválido → `transient`.
- **http/token-store**: set/get/clear espelham em localStorage (mock de `localStorage`).
- **query/retry**: `shouldRetry` retenta `transient`/`network` 1x; não retenta `validation`/`conflict`/
  `unauthenticated`.
- **query/keys**: `normalized(query)` é estável independente da ordem das chaves.
- **realtime/apply-events**: dedupe descarta `version <=`; aplica `priceEth`/`editionsAvailable` no
  detalhe; evento fora de ordem é ignorado; `order.updated` atualiza status.
- **favorites**: `onMutate` aplica otimista; `onError` reverte ao snapshot.

Fora dos testes unitários: a validação em navegador (socket real via `socket.io-client` ↔ binding MSW,
catálogo refletindo `nft.updated`) casa melhor com a Fase 4/5 — anotada como dívida, não bloqueia.

## Verificação
`npm run lint` (0 erros) · `tsc` limpo · `npm run build` OK · `npm run test` verde.
Depois: **nft-reviewer** → corrigir → **nft-tester**.

## Ajustes pós-review (2026-10-17)

nft-reviewer **aprovou sem eliminatórios**. Corrigidos:
- **[High] Isolamento no caminho de 401.** `onUnauthenticated` agora chama `teardownUserData()`
  (disconnect + `clearVersions` + `queryClient.clear()`) além de zerar a sessão; e `adoptSession`
  faz teardown **incondicional** antes de adotar a nova sessão. Fecha a brecha em que uma sessão
  expirada por 401 (que zera `keys.session` → `null`) fazia o login seguinte pular o teardown e
  herdar o cache do usuário anterior. (`session.ts`)
- **[Low] Retry de 4xx mal-rotulado.** `shouldRetry` só retenta `transient` quando `status >= 500`;
  um corpo irreconhecível em 4xx (fallback `transient` de `toApiRequestError`) não é retentado.
  (`retry.ts`)
- **[Low] `reconnect` sem token.** O handler de reconexão retorna cedo quando não há token (evita
  refetch sem `Authorization` logo após o logout). (`index.ts`)
- **[Doc] Listeners no `disconnect`.** Alinhado o texto desta spec à realidade do `socket.io-client`
  (listeners vivem com o socket-singleton; teardown desconecta e zera estado).

Sem dívida pendente relevante. A validação em navegador (socket real ↔ binding MSW) fica para a
Fase 4/5, como já previsto.
