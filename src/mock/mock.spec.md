# Spec — Camada de mock (Fase 2)

## Objetivo

Implementar a **camada de dados simulada** do marketplace inteiramente na camada de rede (MSW),
reutilizando os contratos da Fase 1 (`@/contracts`) como fonte única de formato. Entrega:

1. **`store.ts`** — fonte única da verdade em memória, compartilhada por handlers REST **e**
   servidor-socket; persistência local p/ sobreviver a refresh; `reset()` restaura integralmente
   um cenário conhecido.
2. **`fixtures/`** — dados determinísticos: ≥2 usuários e catálogo com variedade p/ exercitar
   busca, filtros, ordenação e paginação (§6).
3. **`handlers/`** — handlers REST de **todos** os contratos (§5): validação, erros 4xx/5xx,
   idempotência de pedido, incremento de `version`.
4. **`socket/`** — servidor-socket via `@mswjs/socket.io-binding`, mesmo store; emite
   `nft.updated` (por cenário) e `order.updated` (ciclo de vida do pedido).
5. **`scenarios/`** — engine de cenários determinísticos (§6) dirigida por `window.__mock` +
   `?scenario=&seed=` (controle já scaffolded na Fase 0).

**Fora de escopo** (fases seguintes): Axios/interceptors, hooks de Query, wrapper
`socket.io-client`, dedupe/reconciliação no cliente (Fase 3); UI (Fase 4). Esta fase não toca em
componentes nem hooks — critério eliminatório §11 (nada de resposta fictícia fora da camada de rede).

## Princípios aplicados aqui

- **Fonte única da verdade**: um store em memória. REST e socket leem/escrevem o **mesmo** estado;
  mudança via REST reflete em evento e vice-versa (§6: dados consistentes entre catálogo, favoritos,
  carrinho, perfil, carteiras e pedidos).
- **Contratos como validação de borda**: todo request é parseado pelo schema Zod; todo response é
  produzido na forma do schema. Sem tipos redeclarados.
- **`version` por recurso**: toda mutação incrementa a `version` do recurso afetado. Eventos
  carregam a `version` resultante.
- **ETH via `decimal.js`** (helpers de `value-types`), nunca float. Quantidades inteiras.
- **Idempotência de pedido**: mapa `idempotencyKey → { requestHash, orderId }`.
- **Falhas são roteiro**: latência, timeout, perda de conexão e erros HTTP são decididos pela
  engine de cenários, de forma determinística (seed) — nunca aleatório não-reprodutível.
- **MSW ativo também em produção** (deploy estático) — já garantido pela Fase 0.

## Decisões de design — ✅ todas aprovadas (2026-10-16)

> Escolhas confirmadas com o usuário antes da implementação. Defaults em negrito, todos aprovados.

1. **Base URL das rotas REST**: **`/api`** (ex.: `GET /api/nfts`). Prefixo único simplifica o
   `onUnhandledRequest` e o Axios na Fase 3.
2. **Namespace/URL do Socket.IO**: **`/` (default) em `ws://localhost` lógico**, interceptado pelo
   binding; sem servidor real. O cliente (Fase 3) conecta via `socket.io-client` no mesmo host.
3. **Persistência local**: **`localStorage`** sob uma chave versionada
   (`nft-mock:v1:<scenario>:<seed>`), gravando o store serializado. `reset()` limpa a chave e
   re-semeia a partir das fixtures. Alternativa seria não persistir (mais simples, mas refresh
   perde carrinho/sessão — o §6 permite persistência, e §3 exige carrinho/sessão sobreviverem a
   refresh, então **persistir é o caminho**).
4. **Autenticação simulada**: token opaco `mock-token:<userId>:<expEpoch>` no header
   `Authorization: Bearer`. O store resolve o usuário a partir do token. **Sessão expirada** é um
   cenário que encurta `expiresAt` e faz handlers protegidos responderem `401 unauthenticated`.
5. **Carrinho de visitante**: carrinho existe por sessão-anônima (chave de device no store);
   **ao autenticar, o carrinho do visitante é mesclado no do usuário** — soma de quantidades
   respeitando o estoque por NFT/edição (§3). ✅ **Aprovado (2026-10-16)**.
6. **Relógio**: `quotedAt`/`createdAt`/`expiresAt`/`event.at` usam `new Date().toISOString()` por
   padrão; cenários sensíveis a tempo (timeout, expiração) usam **delays configuráveis**, não
   relógio fake no mock — o controle de relógio fino fica no Playwright (Fase 5, `page.clock`).
7. **Credenciais fictícias**: 2 usuários semeados com senha conhecida (ex.:
   `collector@example.com` / `password123`), documentadas no README final (Fase 7).

## Arquitetura da camada

```
src/mock/
  mock.spec.md          este documento
  store.ts              estado + mutações + version + persistência + reset; emite domain-events p/ socket
  db/
    types.ts            tipos internos do store (inclui campos privados: passwordHash, tokens)
    seed.ts             constrói o estado inicial a partir das fixtures (determinístico por seed)
  fixtures/
    users.ts            ≥2 usuários (+ senha fictícia), perfis, carteiras, favoritos iniciais
    nfts.ts             catálogo variado (coleções, faixas de preço, esgotados) p/ filtros/paginação
    coupons.ts          cupons válidos / inválidos / expirados
  handlers/
    index.ts            compõe todos os handlers na ordem correta
    session.ts  nfts.ts  favorites.ts  cart.ts  quote.ts  orders.ts  profile.ts  wallets.ts
    _helpers.ts         parse+validação, envelope de erro, auth guard, aplicação de cenário/latência
  socket/
    server.ts           servidor-socket via binding; assina domain-events do store → emite nft/order.updated
    index.ts            registro no worker
  scenarios/
    registry.ts         definição declarativa de cada cenário (§6) e seus efeitos
    apply.ts            aplica latência/falha/ordem por rota+cenário; PRNG determinístico por seed
    index.ts            liga registry ↔ window.__mock (configureMockControls) + query params
  browser.ts            [existe] setupWorker(...handlers, socket) — passa a receber handlers
  enable.ts             [existe] enableMocks(): planta resetStore no controle + start do worker
  scenario.ts           [existe, Fase 0] estado scenario/seed + window.__mock — reusado tal como está
```

### Store (`store.ts`)

Estado interno (superconjunto dos contratos — inclui campos privados nunca serializados no fio):

```
users:     Map<UserId, { user: User; passwordHash; profile: Profile; }>
tokens:    Map<token, { userId; expiresAt }>
nfts:      Map<NftId, Nft>
favorites: Map<UserId, Favorites>
carts:     Map<ownerKey, Cart>          // ownerKey = UserId | `guest:<deviceId>`
wallets:   Map<UserId, Wallet[]>
quotes:    Map<quoteId, Quote & { cartSnapshot }>   // cotação é referência p/ finalizar
orders:    Map<OrderId, Order>
idempotency: Map<idempotencyKey, { requestHash; orderId }>
```

Responsabilidades:
- **Mutações tipadas** (`addCartItem`, `toggleFavorite`, `createOrder`, `applyNftUpdate`, ...) que
  validam disponibilidade/regras e **incrementam `version`**. Cada mutação relevante publica um
  **domain-event** interno (`nft.updated`, `order.updated`) consumido pelo socket — garante o §6
  (REST muda → evento correspondente).
- **Idempotência**: `createOrder` consulta o mapa; mesma chave + mesmo `requestHash` → devolve o
  pedido existente; mesma chave + hash diferente → `conflict(idempotency_mismatch)`.
- **Persistência**: `load()`/`save()` em `localStorage` (serializa só a parte pública + privada
  mínima necessária p/ auth; ETH já é string). `reset()` apaga e re-semeia pelo cenário atual.
- **`configureMockControls({ resetStore })`**: `enable.ts` pluga `resetStore = () => store.reset()`
  (hoje é no-op da Fase 0).

### Handlers REST (`handlers/`)

Um arquivo por recurso, todos sob `/api`. Pipeline comum (`_helpers.ts`):
`parse request (Zod) → auth guard (se protegido) → aplicar cenário (latência/falha) → mutar/ler store → responder (schema)`.

| Recurso | Rotas |
| --- | --- |
| Sessão/conta | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/session`, `POST /api/auth/logout` |
| NFTs | `GET /api/nfts` (q/filtros/sort/page), `GET /api/nfts/:idOrSlug` |
| Favoritos | `GET /api/favorites`, `POST /api/favorites` (toggle) |
| Carrinho | `GET /api/cart`, `POST /api/cart/items`, `PATCH /api/cart/items`, `DELETE /api/cart/items` |
| Cotação | `POST /api/quote` |
| Pedidos | `POST /api/orders` (idempotente), `GET /api/orders/:orderId` |
| Perfil | `GET /api/profile`, `PATCH /api/profile`, `PUT /api/profile/avatar`, `POST /api/profile/password` |
| Carteiras | `GET /api/wallets`, `POST /api/wallets`, `PATCH /api/wallets/:walletId` |

Regras de erro mapeadas de `ERROR_STATUS` (Fase 1): `validation`→400, `unauthenticated`→401,
`forbidden`→403, `not_found`→404, `conflict`→409, `transient`→503. Validação de corpo falha →
`validation` com `fields` derivado do `ZodError`.

Listagem de NFTs: aplica `q` (título/coleção/creator), filtros combináveis (coleção, faixa de
preço via `decimal.js`, disponibilidade), `sort`, e pagina via `paginatedSchema` (`hasNext`).
Resultado vazio é resposta válida (cenário `empty`).

### Servidor-socket (`socket/`)

- `@mswjs/socket.io-binding@0.2.0` (peer `msw@^2` — compatível com o 2.15 fixado; base v2 como já
  previsto). Registrado junto ao worker em `browser.ts`.
- **Assina os domain-events do store**: quando uma mutação REST altera um NFT ou pedido, o store
  publica → o servidor-socket emite o evento Socket.IO correspondente (envelope da Fase 1:
  `{ id, type, resource, version, at, payload }`), carregando a `version` resultante.
- `order.updated`: dirigido pelo **ciclo de vida** — `createOrder` cria `pending`; após um delay
  configurável (cenário), o store transiciona p/ `confirmed`/`declined` e publica o evento.
- `nft.updated`: dirigido por **cenário** (`price-changed`, `sold-out-during-purchase`) e também por
  mutações que afetem estoque (ex.: pedido confirmado reduz `editionsAvailable`).
- **Isolamento por usuário** (eliminatório §11): o emissor só direciona eventos relevantes; a
  lógica de descarte/escopo no cliente é Fase 3, mas o servidor não vaza dados privados de um
  usuário para outro (eventos de pedido vão ao dono).
- Documentar no `ARCHITECTURE.md` (Fase 7) o transporte e limitações do binding em ambiente de mock.

### Engine de cenários (`scenarios/`)

Cada cenário é declarativo: um id e um conjunto de efeitos por rota/recurso. `apply.ts` consulta o
cenário atual (`getMockState()`) e um **PRNG semeado** (`seed`) p/ reprodutibilidade. Efeitos
possíveis: atraso fixo/variável, resposta fora de ordem (jitter), erro HTTP (4xx/5xx), erro de
conexão (abort), e gatilhos de domínio (mudar preço/estoque, agendar transição de pedido).

Cenários determinísticos exigidos (§6):

| id | Efeito |
| --- | --- |
| `default` | caminho feliz; latências curtas realistas |
| `empty` | catálogo/listagens retornam vazio |
| `slow` / `jitter` | latência alta / variável + respostas fora de ordem |
| `offline` | erros de conexão (abort) em chamadas |
| `http-4xx` / `http-5xx` | respostas de erro HTTP (ex.: `transient` 503) |
| `session-expired` | sessão expira durante navegação → 401 em rotas protegidas |
| `unauthorized` | acesso não autorizado (403/401) |
| `register-conflict` | cadastro com email existente → `conflict(registration)` |
| `coupon-invalid` / `coupon-expired` | cupom rejeitado na cotação |
| `price-changed` | preço de um NFT no carrinho muda via `nft.updated` → cotação desatualizada |
| `sold-out-during-purchase` | edição esgota durante a compra → `conflict(availability)` |
| `order-timeout` | timeout após criar pedido; reenvio com mesma `idempotencyKey` recupera o mesmo pedido |
| `payment-confirmed` / `payment-declined` | `order.updated` terminal confirmando/recusando |

Wiring (`scenarios/index.ts`): registra os cenários e conecta `window.__mock.scenario/seed/reset`
(já existente) aos efeitos reais; `?scenario=&seed=` já é parseado pela Fase 0.

## Ajustes pós-review (2026-10-16)

Após revisão da Fase 2 (aprovada com ressalvas, sem eliminatórios):

**Corrigidos:**
- **A1** — adicionados os cenários `http-4xx` (not_found em todas as rotas) e `unauthorized` (403 nas
  rotas protegidas), que constavam na spec/§6 e faltavam. Novo campo `ScenarioDef.clientError`.
- **A3** — `price-changed`/`sold-out-during-purchase` agora miram, de preferência, um NFT que esteja
  em algum carrinho (`store.firstCartNftId()`), fechando o loop do §7; caímos no NFT de demo só se
  nenhum carrinho tiver itens.
- **M2** — `store.onReset()`: no reset/troca de cenário o servidor-socket zera `conn.userId` das
  conexões vivas, forçando re-handshake (não entrega eventos a dono de sessão inexistente).
- **M3** — conflito de carteira principal duplicada passou de `conflict(registration)` para
  `validation` no campo `role` (semântica correta; a UI distingue do e-mail duplicado).
- **B1** — id de usuário no cadastro agora é opaco (`user-acct-N`), sem PII do e-mail.

**Dívida aceita (documentar no ARCHITECTURE.md da Fase 7):**
- **A2** — `jitter` produz "fora de ordem" como emergência da latência variável; não é reordenação
  estritamente reprodutível por seed (o PRNG usa contador global de chamadas).
- **M1** — `offline` derruba todas as rotas, inclusive `auth.session`; recuperação depende da Fase 3.
- **M4** — cupom inválido/expirado é inline (`coupon.valid=false`), então `conflict(coupon)` fica sem
  emissor (desvio consciente, preferível p/ UI; previsto pelo `couponResultSchema` da Fase 1).
- **B2/B4** — mudanças de carrinho pós-confirmação e logout não emitem evento próprio; o cliente
  reconcilia via invalidação pós-`order.updated` e encerra subscriptions no logout (Fase 3).

## Verificação (fim da fase)

1. `npm run build`, `npm run lint`, `npm run test` verdes.
2. Dev server: catálogo carrega via MSW (Network mostra `/api/nfts` interceptado); `window.__mock`
   presente; `scenario('empty')` → lista vazia; `scenario('slow')` → latência observável.
3. Teste unitário do store: mutação incrementa `version`; idempotência (mesma chave → mesmo pedido;
   chave + conteúdo diferente → 409); reset restaura cenário conhecido.
4. Socket: disparar cenário `price-changed` emite `nft.updated` com `version` coerente ao REST
   (validação via schema de evento). (Consumo real pelo cliente é Fase 3.)

## Tarefas (ordem)

1. `mock.spec.md` (este) — **aprovar**.
2. Instalar `@mswjs/socket.io-binding@0.2.0`.
3. `db/types.ts` + fixtures (`users`, `nfts`, `coupons`) + `db/seed.ts`.
4. `store.ts` (mutações, version, idempotência, persistência, reset, domain-events).
5. `handlers/` (helpers + um arquivo por recurso + index).
6. `socket/` (server + registro no worker via `browser.ts`).
7. `scenarios/` (registry + apply + wiring) e plugar `resetStore` em `enable.ts`.
8. Testes unitários do store/cenários; verificação no dev server.
9. nft-reviewer → correções → nft-tester.
