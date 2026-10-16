# Spec — Contratos tipados (Fase 1)

## Objetivo

Definir, em schemas Zod → tipos inferidos, **todos os contratos de dados** que atravessam
transporte (Axios), estado (TanStack Query) e interface (§4). São a fonte única de verdade de
formato, compartilhada por mock (MSW), cliente HTTP, hooks e UI. Nenhum tipo de recurso é
redeclarado fora daqui.

Esta fase entrega **apenas contratos** (formas, validação, value types, erros, eventos). Store,
handlers, Axios, hooks e UI consomem estes tipos nas fases seguintes.

## Princípios aplicados aqui

- **Zod como fonte**: `z.infer` gera os tipos; validação em runtime disponível para mock e cliente.
- **ETH como string decimal** (`decimal.js`), nunca float. **Quantidades inteiras** (`int`, ≥ 0).
- **`version` por recurso** em todo recurso mutável; eventos carregam a mesma `version` → cliente
  aplica idempotente e descarta eventos antigos/duplicados (§7).
- **Idempotência de pedido** via `idempotencyKey`; o contrato de erro representa o conflito (409).
- **Erros são contrato**, não exceção solta: união discriminada tipada, reusável por todas as camadas.

## Convenções gerais

- **IDs**: strings opacas (`z.string().min(1)`), com tipos de marca (`NftId`, `OrderId`, etc.) para
  evitar troca acidental. Nunca assumir formato numérico.
- **Datas**: ISO-8601 em string (`z.string().datetime()`). Sem `Date` no fio.
- **Dinheiro (ETH)**: `EthAmount` — string decimal validada (ver Value types). Toda taxa, preço,
  subtotal, desconto e total usa este tipo.
- **Quantidade**: `Quantity` — inteiro ≥ 1 em itens de carrinho; ≥ 0 onde representar estoque.
- **Versão**: `version: z.number().int().nonnegative()`. Incrementa a cada mutação do recurso.
- **Paginação**: resposta envelopada `{ items, page, pageSize, total, hasNext }`. Cursor não é
  necessário para o volume de fixtures; página/offset basta e casa com o estado da URL (§3 catálogo).
- **Envelope de resposta**: respostas de sucesso retornam o recurso/coleção direto (sem wrapper
  `{ data }`), mantendo contratos enxutos. Erros usam o envelope de erro padrão (abaixo).

## Ajustes pós-review (2026-10-16)

Aplicados após revisão da Fase 1 (achados H1, H2, M1, M2, M3):
- **Paginação coage strings** (`z.coerce`) — search params da URL chegam como string.
- **`StockQuantity`** (inteiro ≥ 0, mesmo brand `Quantity`) para `editionsAvailable`/
  `availableEditions` e payload de evento; `Quantity` (≥ 1) segue para itens.
- **Schemas de parâmetro de rota**: `getNftParams` (id|slug), `getOrderParams`; request de
  remoção de carrinho (`removeCartItemRequest`); `updateAvatarRequest` (avatar por URL).
- **`nft.updated` exige ao menos um campo de estado** (`priceEth` e/ou `editionsAvailable`).

Deferidos (Low, dependem da Fase 4/UX): enum de `network`, `avatarUrl` nullable p/ remover avatar,
renome de `coupon.reason`. Ficam como decisão da feature correspondente.

## Value types

### `EthAmount`
- String decimal não-negativa, validada por `decimal.js` (`new Decimal(v)` não lança; finito).
- Normalização canônica na borda de entrada (ex.: `"1.50"` e `"1.5"` comparam iguais via Decimal).
- Helpers (em `value-types.ts`, cobertos por teste): `parseEth`, `formatEth(v, { maxFractionDigits })`,
  `addEth`, `subEth`, `mulEth(amount, qty)`, `gteEth`/`eqEth`. Aritmética sempre via Decimal.
- **Nunca** convertido para `number` em cálculo ou comparação de dinheiro.

### `Quantity`
- `z.number().int()`, com helpers de limite por NFT/edição (validação de disponibilidade vive no
  mock, mas o tipo garante inteiro ≥ 1 em itens).

## Modelo de erros (união discriminada)

Envelope único retornado em respostas não-2xx, discriminado por `code`:

| `code` | HTTP | Campos extras | Uso |
| --- | --- | --- | --- |
| `validation` | 400 | `fields: { [path]: string[] }` | Erros de formulário/campos (§3 conta/carteiras) |
| `unauthenticated` | 401 | — | Sessão ausente/expirada (§ sessão) |
| `forbidden` | 403 | — | Falta de permissão |
| `not_found` | 404 | `resource: string` | Recurso inexistente (ex.: NFT, pedido) |
| `conflict` | 409 | `reason: "availability" \| "idempotency_mismatch" \| "coupon" \| "price_changed" \| "registration"` | Disponibilidade, chave de idempotência reusada com conteúdo diferente, cupom, preço alterado, cadastro duplicado |
| `transient` | 503 | `retryable: true` | Falha transitória (cenário de retry) |

Forma base: `{ code, message }` + extras por variante. Tipo `ApiError = z.infer<...>` e type guard
`isApiError`. Latência/timeout/indisponibilidade de conexão são comportamento de transporte
(cenários MSW, Fase 2), não variantes de corpo.

## Recursos REST (§5)

Para cada recurso: schema do recurso, schemas de request/response das operações, e erros aplicáveis.

### Sessão e conta
- `User` (público): `{ id, email, displayName, avatarUrl?, createdAt }` — **nunca** inclui senha/hash.
- `register` → req `{ email, password, displayName }`; res `Session`. Erros: `validation`,
  `conflict(registration)` (email já existe).
- `login` → req `{ email, password }`; res `Session`. Erros: `validation`, `unauthenticated`.
- `getSession` → res `Session | null` (recuperável após refresh). Erro: — (null quando sem sessão).
- `logout` → res `204`. Limpa dados privados no cliente (teardown na Fase 3).
- `Session`: `{ user: User, token: string, expiresAt }`. Expiração tratada em navegação e checkout.

### NFTs
- `Nft`: `{ id, title, slug, description, imageUrl, collection, creator, priceEth: EthAmount,
  editionsTotal: Quantity, editionsAvailable: Quantity, attributes: {trait,value}[], version }`.
- `listNfts` → query `{ q?, filters (combináveis), sort, page, pageSize }`; res paginado de `Nft`.
  Filtros reiniciam paginação (regra de UI, mas o contrato aceita `page`). Resultado vazio é válido.
- `getNft(id | slug)` → res `Nft`. Erro: `not_found(resource:"nft")`. Suporta acesso direto.
- Enum de `sort` (ex.: `price_asc`, `price_desc`, `recent`) e shape de `filters` definidos no schema
  (coleção, faixa de preço, disponibilidade). Serializáveis na URL (§3).

### Favoritos (requer auth)
- `listFavorites` → res `NftId[]` (ou `Nft[]` resumido). Persistem por usuário autenticado.
- `addFavorite(nftId)` / `removeFavorite(nftId)` → res estado atualizado + `version`. Alvo da
  **atualização otimista com rollback** (§4). Erros: `unauthenticated`, `not_found`.

### Carrinho (requer auth para persistir; visitante preservado ao autenticar — §3)
- `CartItem`: `{ nftId, title, imageUrl, unitPriceEth: EthAmount, quantity: Quantity,
  availableEditions: Quantity, version }` (version da linha segue o NFT).
- `Cart`: `{ items: CartItem[], version }`.
- `getCart`, `addItem({nftId, quantity})`, `updateItem({nftId, quantity})`, `removeItem(nftId)`
  → res `Cart`. Respeitam disponibilidade por NFT/edição. Erros: `conflict(availability)`,
  `not_found`, `validation`.

### Cotação (§3 carrinho / §7 checkout)
- `Quote`: `{ items: {nftId, quantity, unitPriceEth, lineTotalEth}[], subtotalEth, discountEth,
  networkFeeEth, totalEth, coupon?: {code, valid, reason?}, version, quotedAt }`.
- `createQuote({ cartVersion, couponCode? })` → res `Quote`. **A cotação da API é a referência para
  finalizar** (§3). Erros: `conflict(coupon)` (inválido/expirado), `conflict(price_changed)`
  (preço/disponibilidade mudou → exige nova confirmação), `validation`.

### Pedidos (criação idempotente — §5/§7)
- `Order`: `{ id, status: "pending"|"confirmed"|"declined", items: OrderItem[], subtotalEth,
  discountEth, networkFeeEth, totalEth, wallet: {address, network}, txRef?, createdAt, version }`.
  `OrderItem` é **snapshot imutável** (título, preço, quantidade no momento da compra) → o recibo
  não muda com o catálogo depois.
- `createOrder` → req `{ quoteVersion, walletId, network, idempotencyKey }`; res `Order` (inicialmente
  `pending`). **Mesma `idempotencyKey` recupera o mesmo pedido**; mesma chave + conteúdo diferente →
  `conflict(idempotency_mismatch)`. Outros erros: `conflict(price_changed)`, `conflict(availability)`,
  `unauthenticated`.
- `getOrder(id)` → res `Order` (consulta de estado e recibo; recuperação após refresh/reconexão).
  Estados `confirmed`/`declined` são terminais. Confirmação só exibida para pedido efetivamente
  confirmado na simulação (§3). Transição de estado chega por `order.updated` (§7).

### Perfil (requer auth)
- `Profile`: `{ id, displayName, email, avatarUrl?, bio?, version }`.
- `getProfile`, `updateProfile(patch)`, `updateAvatar(file/url)`, `changePassword({current, next})`
  → res `Profile` (ou `204` na senha). Erros: `validation`, `unauthenticated`,
  `forbidden` (senha atual incorreta → `validation`/`forbidden` a decidir na impl, documentar).

### Carteiras (requer auth)
- `Wallet`: `{ id, label, address, network, role: "primary"|"secondary", version }`.
- `listWallets`, `createWallet`, `updateWallet(patch)` → res `Wallet`/`Wallet[]`. Erros:
  `validation`, `conflict` (ex.: duas primárias), `unauthenticated`. Seleção/conexão/recusa de
  carteira é simulação de UI/checkout (Fase 4), não contrato REST.

## Eventos Socket.IO (§7)

Envelope comum a todo evento:
`{ id: string (identidade estável), resource: {type, id}, version, at: datetime, payload }`.

- `nft.updated` → `payload: { priceEth?: EthAmount, editionsAvailable?: Quantity }`. Atualiza
  preço/disponibilidade em catálogo, detalhe e carrinho. Dirige o cenário crítico §7 (preço muda com
  item no carrinho → UI avisa, resumo atualiza, checkout bloqueia cotação desatualizada).
- `order.updated` → `payload: { status: "confirmed"|"declined", txRef? }`. Atualiza estado do pedido
  e apresenta confirmação/recusa.

Regras que o **tipo** sustenta (lógica fica na Fase 3):
- `version` permite ao cliente **descartar evento antigo/duplicado** (não regride estado mais novo).
- `resource.id` + escopo de usuário permitem impedir que evento de sessão anterior atualize outro
  usuário (isolamento — eliminatório §11).

## Estrutura de arquivos (Fase 1)

```
src/contracts/
  contracts.spec.md      este documento
  value-types.ts         EthAmount, Quantity, helpers decimais (+ value-types.test.ts)
  errors.ts              união discriminada ApiError, isApiError (+ errors.test.ts)
  common.ts              IDs de marca, paginação, datas, version
  session.ts  nft.ts  favorites.ts  cart.ts  quote.ts  order.ts  profile.ts  wallet.ts
  events.ts              envelope de evento + nft.updated / order.updated
  index.ts               reexporta schemas e tipos
```
Cada arquivo exporta o schema (`xSchema`) e o tipo (`type X = z.infer<typeof xSchema>`). Testes
unitários (`*.test.ts`) cobrem: parse válido/ inválido dos recursos-chave, precisão de `EthAmount`,
discriminação de `ApiError` e validação do envelope de eventos.

## Fora de escopo (fases seguintes)

- Store/fonte única, fixtures, handlers, idempotência **em runtime**, cenários → Fase 2.
- Instância Axios, interceptors, hooks de Query, wrapper socket, dedupe/reconciliação → Fase 3.
- Formulários, layout, responsividade, a11y → Fase 4.

## Decisões aprovadas (2026-10-16)

1. **Envelope de sucesso enxuto** — recurso/coleção direto, sem `{ data }`. ✅
2. **Paginação por página/offset** (não cursor). ✅
3. **`getSession` retorna `null`** sem sessão (em vez de 401) para simplificar o boot. ✅
4. **Senha atual incorreta** mapeada como `validation` no campo `current` (em vez de `forbidden`). ✅
