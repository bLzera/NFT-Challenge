# Spec — Área de conta: `profile` + `wallets` + `favorites` (Fase 4)

> Último bloco de UI da Fase 4: a **conta do colecionador** (README §3 "Conta e sessão" → perfil,
> carteiras, favoritos; §5 "Perfil"/"Carteiras"/"Favoritos"; §8 estados/skeletons; §9.4/§9.8
> fluxos E2E; §11 eliminatórios). Três **rotas privadas** já registradas em `src/app/router.tsx`
> como `PlaceholderPage` — `/profile`, `/wallets`, `/favorites` — ganham a UI real. Consome a camada
> de dados da Fase 3 e os primitivos/rotas/guarda da `foundation` (`src/app/foundation.spec.md`) e
> **não** reimplementa tokens, header, estados, FormField nem `requireAuth`.
>
> Design: `design/components/Desktop_Perfil_do_Colecionador.md` e `Desktop_Carteiras.md` (layout de
> conta com **sidebar "Meu perfil"** + formulário à direita). **Não há frame** de Favoritos nem
> frames Mobile de conta — derivados do padrão (README §3: "Perfil, carteiras e confirmação também
> devem funcionar em mobile, mesmo sem um frame específico"). Dark, Roboto Mono.

## Objetivo e fronteiras

**Entrega (uma feature agrupada, 3 telas):**

1. **`/profile`** — exibir e editar dados do perfil (nome de exibição, bio, avatar por URL), exibir
   e-mail (read-only, não há contrato de troca), e **alterar senha**. Validação cliente (RHF +
   zodResolver sobre `@/contracts`) + erros da API mapeados ao campo. Estados loading/erro/sucesso.
2. **`/wallets`** — listar carteiras (`listWallets`), **cadastrar** (`createWallet`) e **editar**
   (`updateWallet`) carteira principal/secundária. É o destino do checkout quando o usuário não tem
   carteira (checkout spec A4 → `<Link to="/wallets">`). Validação + mapeamento de erro por campo.
3. **`/favorites`** — listar os NFTs favoritados (`getFavorites` → `nftIds`, resolvidos via `getNft`),
   **remover/alternar** via `useToggleFavorite` (`@/lib/favorites`, otimista + rollback **reusado**,
   não redeclarado), empty state, cada item navega ao detalhe; reflete em tempo real (só lê o cache).
4. **Layout de conta compartilhado** (`AccountLayout`) com a sidebar "Meu perfil" do Figma como
   navegação entre as 3 rotas + "Sair" (reusa `signOut` da sessão; não duplica a lógica).

**Fora de escopo (não podem aparentar sucesso — §3/§11):**

- Itens de sidebar sem rota/contrato: **Atividade, Lista de interesse, Ofertas, Arquivos baixados,
  Suporte** (§3: "atividade, ofertas e downloads não fazem parte da entrega"). Renderizar conforme o
  Figma, porém **desabilitados/não-funcionais** e anunciados como indisponíveis (`aria-disabled`,
  sem `Link`). "Lista de interesse" (Watchlist) **não** se confunde com Favoritos — Favoritos é a
  feature real; Watchlist fica desabilitado.
- Campos do Figma **sem contrato**: perfil tem "Nome ENS/.eth", "Apelido da carteira", "Website";
  carteiras tem "Código de indicação", "Nome do perfil", "E-mail", "Nome ENS/.eth",
  "Igual à carteira principal". **Não** renderizar campos editáveis que simulem persistência sem
  backend (§6: componentes não contêm caminhos de negócio fictícios). O formulário usa **apenas** os
  campos dos contratos (`UpdateProfileRequest`/`ChangePasswordRequest`/`CreateWalletRequest`).
- **Upload de arquivo de avatar**: o contrato é `updateAvatar(avatarUrl: string)` (URL, não upload).
  O botão "Alterar"/"Remover" do Figma opera sobre **URL** (campo de texto/colar URL), não `<input
  type=file>`. Documentado como decisão (A-profile-3).
- Conexão de carteira/extensão/rede real, simulação de conexão: é do `checkout`. Em `wallets` só há
  CRUD de dados persistidos.

## Decisões transversais

- **A1 — Três rotas separadas + layout compartilhado (NÃO abas de uma rota única).** Hoje as 3 rotas
  já estão registradas e deep-linkáveis (header `AccountMenu` → `/profile`/`/wallets`/`/favorites`;
  checkout → `/wallets`). Mantê-las como rotas distintas (melhor p/ Playwright §9 e deep-link) e
  extrair um **`AccountLayout`** (sidebar + slot) reusado pelas 3 telas via composição React (cada
  `component` da rota renderiza `<AccountLayout active="profile|wallets|favorites">{conteúdo}</>`).
  **Não** se cria rota-pai nem se mexe em `beforeLoad` — cada feature só troca o `component` da sua
  rota. A sidebar usa `<Link>` tipados com estado ativo por rota.
- **A2 — Sidebar: só os itens com rota são `Link`; o resto é decorativo/desabilitado.** "Dados do
  perfil" → `/profile`, "Carteiras" → `/wallets`, e **"Favoritos"** entra na sidebar (substituindo o
  rótulo decorativo "Lista de interesse" por um item real → `/favorites`, pois Favoritos é a feature
  entregue e precisa de ponto de navegação consistente com o `AccountMenu`). Os demais
  (Atividade/Ofertas/Downloads/Suporte) ficam visíveis-porém-inertes (§3). "Sair" dispara `signOut`.
- **A3 — Formulários: `react-hook-form` + `@hookform/resolvers` (zod), padrão `auth`.** Já em
  `DEPENDENCIES.md` (A4 da `auth`); nenhuma dep nova. Schemas derivados de `@/contracts` via
  `.extend` **só** para relocalizar mensagens pt-BR e adicionar validação cliente (ex.: `confirmPassword`).
  O corpo enviado à API é exatamente o `*Request` do contrato. Integra com `FormField` da foundation.
- **A4 — Mapeamento de erro API→campo reusa o padrão `applyAuthError`.** Criar
  `apply-field-errors.ts` colado à feature (genérico sobre `HttpError.detail` + `isApiCode`), não
  importar o de `auth` (acoplamento de features). Mesma regra: `validation` (400) distribui por campo
  via `error.fields`; sobra/`transient`/`network`/`forbidden` vão para `root` (`role="alert"`).
  **Nunca fabricar dado no catch** (eliminatório §11).
- **A5 — Isolamento por usuário já é garantido pela camada de dados.** `signOut`/`signIn` fazem
  `queryClient.clear()` + teardown de socket (SESSION_CONTEXT §Isolamento). A conta só **lê** caches
  privados (`keys.profile`/`keys.wallets`/`keys.favorites`) por `useQuery`; ao trocar de usuário, o
  clear invalida tudo e os hooks refazem fetch. A feature não implementa isolamento próprio.
- **A6 — Responsivo sem frame mobile (README §3).** Desktop (≥1024): sidebar fixa à esquerda (310px,
  `surface-card`) + formulário à direita (`Body` row, gap 28). Mobile/tablet (390/768): sidebar
  colapsa — vira um seletor de seção no topo (lista de `Link`s horizontal rolável ou `Select`) e o
  conteúdo ocupa a largura; sem overflow nos 3 breakpoints.

## Layout compartilhado — `AccountLayout`

Do Figma (`Desktop_Perfil_*`/`Desktop_Carteiras`, nó "Account Sidebar" + "Body"):

- Container: `fill #140D0A` (`Color/Ink`, já o fundo do shell), padding da área de conteúdo, `Body`
  em `layout:row gap:28`. Header/footer são do shell (foundation) — **não** redesenhar.
- **Sidebar** (`surface-card` `#241612`, radius do card, `padding 8 0`): título "Meu perfil"
  (`Body Large/18 Bold`, `Color/Foreground`). Itens de navegação (`Body/15 Regular`, `Text/Accent`
  `#E89B55`), cada linha com ícone `lucide` + rótulo; item ativo com borda/realce `Color/Primary`
  (`#D28A4C`) à esquerda (o Figma usa `stroke #D28A4C strokeWeight 1` no item ativo). Divisor
  (`Line`, `Color/Primary` 0.3). "Sair" (`Body/15 Bold`, `Text/Accent`) no rodapé da sidebar.
- `active: "profile" | "wallets" | "favorites"` controla realce + `aria-current="page"`.
- Mobile (A6): a sidebar vira nav horizontal/seletor no topo do conteúdo.

## Tela 1 — Perfil (`/profile`)

### Layout e campos (Figma `Desktop_Perfil_do_Colecionador`)

Coluna "Profile Form" (`layout:column gap:32`):

- Título **"Perfil do colecionador"** (`Body Large/16 Bold`, `Color/Foreground`).
- Seção **Fields** (`gap:24`), em linhas de 2 colunas no desktop (`justify: SPACE_BETWEEN`):
  - **Nome de exibição** (`displayName`, obrigatório `*` em `Text/Coral`) — input `stroke
    Color/Border #3F2319`, `radius 3`.
  - **E-mail** — exibido **read-only** (não há contrato de troca de e-mail; `Profile.email` só
    leitura). Rotular como somente leitura, não submeter.
  - **Bio** (`bio`, opcional) — `textarea` (o contrato permite string livre). (O Figma rotula vários
    campos extras — "Nome ENS", "Apelido da carteira", "Website" — **fora de escopo**, A sem-contrato;
    reaproveitar os slots visuais apenas para os campos reais.)
  - **Avatar** (`avatarUrl`, opcional, URL) — controles "Alterar"/"Remover" do Figma operam sobre a
    **URL** (campo para colar URL + preview circular `radius 25`, `surface-raised` placeholder). Sem
    upload de arquivo (A-profile-3). "Remover" envia `avatarUrl` vazio/omitido via `updateProfile`.
- Seção **"Alterar senha"** (`Body Large/16 Medium`, `gap:24`): **Senha atual** (`current`),
  **Nova senha** (`next`, min 8), **Confirmar nova senha** (confirmação **só cliente**). Inputs de
  senha reusam o componente `PasswordInput` da `auth` (`src/features/auth/password-input.tsx`) —
  mostrar/ocultar acessível (`aria-pressed`/`aria-label`).
- CTA **"Salvar"** (`Color/Primary`, `radius 3`, texto `Color/Ink` `Body/14 Bold`).

> Estados não desenhados (erro de API, carregando, campo inválido, sucesso) seguem a foundation:
> `LoadingState`/skeleton na carga inicial, `ErrorState` em falha de leitura (com `onRetry`),
> `FormField` com erro `role="alert"` associado por `aria-describedby`, `toast` (sonner) de sucesso.

### Decisões do perfil

- **A-profile-1 — Dois formulários independentes.** "Dados do perfil" (`updateProfile`) e "Alterar
  senha" (`changePassword`) são mutations/forms separados, cada um com seu CTA e seu estado de erro —
  o Figma tem um "Salvar" só, mas semanticamente são endpoints distintos (`PATCH /profile` vs
  `POST /profile/password`); unir num submit misturaria validações e sucessos parciais. **Alternativa
  a confirmar com o orquestrador:** manter visualmente um botão "Salvar" que dispara os dois em
  sequência — preferimos dois CTAs ("Salvar perfil" / "Alterar senha") por clareza de erro.
- **A-profile-2 — E-mail read-only.** `Profile.email` existe mas não há `UpdateProfileRequest.email`
  nem endpoint de troca → campo exibido desabilitado. Não simular edição (§3).
- **A-profile-3 — Avatar por URL.** Contrato `updateAvatar(avatarUrl: string)` /
  `UpdateProfileRequest.avatarUrl` são URL (`z.url()`). UI usa campo de URL + preview; sem upload. O
  avatar pode ir junto no `updateProfile` (que aceita `avatarUrl`) **ou** via `updateAvatar` dedicado
  — usar `updateProfile` no submit do form (um request), reservando `updateAvatar` só se houver ação
  isolada de avatar. Confirmar com orquestrador se quer botão de avatar separado.

### Dados, hooks e mutations (perfil)

Arquivos a criar em `src/features/account/profile/`:

- `use-profile.ts` — `useQuery({ queryKey: keys.profile, queryFn: getProfile })`. Gated por sessão
  (rota já é privada; `enabled` desnecessário pois `requireAuth` garante sessão, mas seguir o padrão
  de `useWallets(enabled)` se o layout montar hooks antes da guarda — aqui a guarda roda em
  `beforeLoad`, então `enabled` default).
- `use-update-profile.ts` — `useMutation({ mutationFn: updateProfile, retry: 0 })`;
  `onSuccess` → `setQueryData(keys.profile, serverProfile)` (adota a `version` do servidor) +
  `invalidateQueries(keys.profile)`; toast de sucesso; `applyFieldErrors` no `onError` do submit.
- `use-change-password.ts` — `useMutation({ mutationFn: changePassword, retry: 0 })`; `onSuccess`
  limpa os campos de senha + toast; `onError` mapeia (senha atual incorreta → erro no campo
  `current`, ver tabela). `changePassword` retorna `void` (não revalida cache).
- `profile-schemas.ts` — `profileFormSchema` (extend de `updateProfileRequestSchema`, mensagens
  pt-BR) e `changePasswordFormSchema` (extend de `changePasswordRequestSchema` + `confirmNext`
  `superRefine` match, só cliente; corpo enviado = `{ current, next }`).
- `profile-form.tsx`, `change-password-form.tsx`, `avatar-field.tsx`, `profile-screen.tsx`.

Imports: `@/contracts` (`Profile`, `UpdateProfileRequest`, `ChangePasswordRequest`,
`updateProfileRequestSchema`, `changePasswordRequestSchema`); `@/lib/http/api`
(`getProfile`, `updateProfile`, `updateAvatar`, `changePassword`); `@/lib/query/keys` (`keys.profile`);
`@/components/form-field`, `@/components/state`, `@/components/ui/*`, `src/features/auth/password-input`.

### Validação e erros (perfil)

| Cenário | `code` (status) | Tratamento na UI |
| --- | --- | --- |
| Campo obrigatório vazio / URL inválida | (cliente, zod) | Erro no campo via `FormField`. |
| Nova senha < 8 / confirmação divergente | (cliente, zod) | Erro no campo `next`/`confirmNext`. |
| Validação do servidor | `validation` (400) | `error.fields` → por campo; sobra → `root`. |
| **Senha atual incorreta** | `validation` (400), campo `current` | Erro **no campo "Senha atual"** (contrato profile.ts: "Senha atual incorreta → `validation` no campo `current`"). |
| Sessão expirada | `unauthenticated` (401) | Interceptor global faz teardown → `requireAuth` manda a `/login?redirect=/profile`. Não tratar inline. |
| Falha transitória / rede | `transient` (503) / `network` | `root` + botão volta ao normal; permitir reenvio. Sem dado fabricado. |

## Tela 2 — Carteiras (`/wallets`)

### Layout e campos (Figma `Desktop_Carteiras`)

Coluna "Wallets Form" (`gap:32`):

- **Section Heading**: "Carteira principal" (`Body Large/17 Bold`) + ação "Adicionar"
  (`Text/Accent`). Subtítulo: "Estas carteiras ficam disponíveis no pagamento e para receber NFTs
  comprados." (`Text/Secondary`).
- **Lista das carteiras existentes** (`listWallets` → `Wallet[]`): cada carteira exibe `label`,
  `address` (truncado, mono), `network`, `role` (badge "Principal"/"Secundária"), com ação **Editar**.
  Esse é o requisito real; os "Field Row" do Figma são o **formulário de cadastro/edição**.
- **Formulário de carteira** (cadastro/edição) — **apenas** os campos do contrato
  `CreateWalletRequest = { label, address, network, role }`:
  - **Nome de exibição / Apelido** → `label` (obrigatório).
  - **Endereço da carteira** → `address` (obrigatório; placeholder "Endereço 0x da carteira").
  - **Rede** → `network` (obrigatório; `Select` — ver A-wallets-2 sobre as opções).
  - **Tipo de carteira** → `role` (`"primary" | "secondary"`, `Select`; Figma "Selecione uma
    carteira"/"Tipo de carteira").
  - Os demais campos do Figma ("Código de indicação", "Nome do perfil", "E-mail", "Nome ENS",
    "Igual à carteira principal") são **fora de escopo** (A sem-contrato) — não renderizar como campos
    persistentes.
- CTA **"Salvar carteira"** (`Color/Primary`, texto `Color/Ink`).
- Bloco **"Carteira secundária"** com empty state do próprio Figma: "Você ainda não adicionou uma
  carteira secundária." + "Adicionar" — mapeia a criação de uma carteira `role: "secondary"`.

### Decisões de carteiras

- **A-wallets-1 — Mutações por invalidação, NÃO otimista.** `createWallet`/`updateWallet` retornam o
  `Wallet` autoritativo (com `version` do servidor); cadastro/edição não são interações de alta
  frequência como o toggle de favorito e um estado otimista mal reconciliado aqui confundiria o
  usuário (lista de carteiras usada pelo checkout). Padrão: `useMutation({ retry: 0 })` →
  `onSuccess` faz `invalidateQueries(keys.wallets)` + fecha o form + toast. (Contraste com
  `use-toggle-favorite`, que é otimista por ser toggle instantâneo.) Justificativa registrada aqui.
- **A-wallets-2 — Opções de rede.** Não há contrato/endpoint listando redes; `network` é string
  livre (checkout spec A4: "Não inventar redes que não existam nas carteiras do usuário"). Para
  **cadastro**, oferecer um conjunto fixo coerente com as fixtures (ex.: `ethereum`, `polygon`) como
  opções do `Select`, derivado das redes já presentes em `listWallets` + um default seguro. Confirmar
  com orquestrador se as fixtures do mock expõem o conjunto de redes esperado (verificar
  `src/mock/fixtures`); se expuserem, derivar dali.
- **A-wallets-3 — Destino do checkout sem carteira.** O checkout (A4) manda `<Link to="/wallets">`
  quando `listWallets` → `[]`. Esta tela é esse destino; ao cadastrar a primeira carteira e voltar,
  o checkout refaz `listWallets` (cache invalidado) e libera a seleção. Nenhum parâmetro de retorno
  especial exigido (o usuário navega de volta); **opcional** aceitar `?redirect=` para um CTA
  "Voltar ao pagamento" — marcar como enriquecimento, não requisito.
- **A-wallets-4 — Form de edição reusa o de cadastro.** `updateWallet(walletId, UpdateWalletRequest)`
  — `UpdateWalletRequest` é `CreateWalletRequest.partial()`. Mesmo form; modo "edição" pré-preenche e
  envia `updateWallet`, modo "cadastro" envia `createWallet`.

### Dados, hooks e mutations (carteiras)

Arquivos a criar em `src/features/account/wallets/`:

- `use-wallets.ts` — `useQuery({ queryKey: keys.wallets, queryFn: listWallets })`. **NOTA:** já
  existe `src/features/checkout/use-wallets.ts` com `useWallets(enabled)`. Para evitar duplicação,
  **promover/reusar** esse hook ou criar um equivalente colado à conta — confirmar com orquestrador
  se prefere mover `use-wallets` para um local compartilhado (`@/lib/wallets`) consumido por checkout
  **e** account, ou duplicar. Recomendação: **mover para `@/lib/wallets/use-wallets.ts`** (igual ao
  padrão de `@/lib/cart` extraído na feature `cart`) e ambos importarem de lá.
- `use-create-wallet.ts` — `useMutation({ mutationFn: createWallet, retry: 0 })` →
  `onSuccess` invalida `keys.wallets` + toast; `onError` `applyFieldErrors`.
- `use-update-wallet.ts` — `useMutation({ mutationFn: ({ walletId, body }) => updateWallet(walletId,
  body), retry: 0 })` → mesma reconciliação por invalidação.
- `wallet-schemas.ts` — `walletFormSchema` (extend de `createWalletRequestSchema`, mensagens pt-BR).
- `wallet-list.tsx`, `wallet-form.tsx`, `wallets-screen.tsx`.

Imports: `@/contracts` (`Wallet`, `WalletId`, `WalletRole`, `CreateWalletRequest`,
`UpdateWalletRequest`, `createWalletRequestSchema`, `walletRoleSchema`); `@/lib/http/api`
(`listWallets`, `createWallet`, `updateWallet`); `@/lib/query/keys` (`keys.wallets`).

### Validação e erros (carteiras)

| Cenário | `code` (status) | Tratamento na UI |
| --- | --- | --- |
| `label`/`address`/`network`/`role` vazios | (cliente, zod) | Erro no campo via `FormField`. |
| Validação do servidor (ex.: endereço inválido) | `validation` (400) | `error.fields` → por campo; sobra → `root`. |
| Conflito (ex.: carteira duplicada, se o mock o emitir) | `conflict` (409) | Mensagem `root` descritiva (sem fabricar). |
| Sessão expirada | `unauthenticated` (401) | Teardown global → `requireAuth` → `/login?redirect=/wallets`. |
| Falha transitória / rede | `transient` / `network` | `root` + reenvio; sem dado fabricado. |

## Tela 3 — Favoritos (`/favorites`)

> **Sem frame no Figma.** Derivar do padrão do catálogo: grade de `NftCard` reaproveitando
> `src/features/catalog/nft-card.tsx` (ou um card de favorito com botão remover), título "Favoritos"
> dentro do `AccountLayout`, estados loading (skeletons de card, sem layout shift), vazio e erro.

### Decisões de favoritos

- **A-fav-1 — `getFavorites` retorna só `nftIds`; a tela resolve cada NFT.** `favoritesSchema =
  { nftIds, version }` não traz os NFTs completos e **não há** endpoint de batch. Resolver cada id
  com `useQueries` → `getNft(id)` chaveado por `keys.nft.detail(id)` (mesma chave do detalhe → cache
  compartilhado, e os eventos `nft.updated` do socket já reconciliam esses caches). Assim o preço/
  disponibilidade do favorito **reflete em tempo real** (a UI só lê o cache — SESSION_CONTEXT §realtime).
  Confirmar com orquestrador: `keys.nft.detail` espera `idOrSlug`; os `nftIds` de favoritos são **ids**,
  e `getNft` aceita id ou slug (nft-detail spec A2) — ok usar o id direto.
- **A-fav-2 — Remover = toggle via `useToggleFavorite` (reusado, otimista + rollback).** Cada card
  tem ação "Remover dos favoritos" que chama `useToggleFavorite().mutate(nftId)`. O hook de
  `@/lib/favorites` já aplica otimista (`onMutate` tira do cache), rollback (`onError`) e reconcilia
  (`onSuccess` adota `version` do servidor; `onSettled` invalida). **Não** redeclarar o padrão. Como
  a lista deriva de `keys.favorites`, remover um item some da grade na hora e volta em erro.
- **A-fav-3 — Empty state (§8, §9.4).** `getFavorites` → `nftIds: []` → `EmptyState` ("Você ainda
  não favoritou nenhum NFT.") com CTA `<Link to="/">` ("Explorar o catálogo"). Não confundir com erro.
- **A-fav-4 — Falha de mutation e recuperação (§9.4).** Toggle que falha → rollback visível (o item
  reaparece) + toast de erro, sem dado fabricado. Favoritar/desfavoritar permanece após refresh
  (persistido por usuário, §3) — garantido pela camada de dados.

### Dados, hooks e mutations (favoritos)

Arquivos a criar em `src/features/account/favorites/`:

- `use-favorites-list.ts` — `useQuery({ queryKey: keys.favorites, queryFn: getFavorites })` +
  `useQueries` sobre `data.nftIds` (`keys.nft.detail(id)` / `getNft(id)`). Expõe `{ favorites,
  nfts, isPending, isError, ... }`. (Reusa o padrão de leitura de `use-favorites-status.ts`.)
- `favorites-screen.tsx`, `favorite-card.tsx` (ou reuso de `NftCard` + botão remover sobreposto).

Imports: `@/contracts` (`Favorites`, `Nft`, `NftId`); `@/lib/http/api` (`getFavorites`, `getNft`);
`@/lib/query/keys` (`keys.favorites`, `keys.nft.detail`); `@/lib/favorites` (`useToggleFavorite`);
`@/components/state` (`EmptyState`, `ErrorState`), `src/features/catalog/nft-card` (reuso).

### Validação e erros (favoritos)

| Cenário | `code` (status) | Tratamento na UI |
| --- | --- | --- |
| Lista vazia | — (`nftIds: []`) | `EmptyState` + CTA catálogo (A-fav-3). |
| Falha ao carregar lista | qualquer | `ErrorState` com `onRetry` (`query.refetch`). |
| NFT individual falha ao resolver | qualquer | Card em estado de erro/placeholder isolado; não derruba a grade inteira. |
| Toggle falha | qualquer | Rollback otimista (hook) + toast; item reaparece (A-fav-4). Sem dado fabricado. |
| Sessão expirada | `unauthenticated` (401) | Teardown global → `requireAuth` → `/login?redirect=/favorites`. |

## Roteamento e navegação

- As 3 rotas (`profileRoute`/`walletsRoute`/`favoritesRoute`) já existem em `src/app/router.tsx` com
  `beforeLoad: requireAuth` — cada feature **troca só o `component`** pela screen real. **Não** criar
  rota-pai, não recriar `beforeLoad`, não alterar `validateSearch` (nenhuma das 3 precisa de estado de
  busca/filtro na URL → **não** se aplica `normalizeNftQuery`).
- Navegação entre as 3 pela `AccountLayout` (sidebar), com `aria-current="page"` no item ativo e
  preservação do histórico. Links externos consistentes com o `AccountMenu` do header.
- `/wallets` **opcionalmente** aceita `?redirect=` para "voltar ao pagamento" (A-wallets-3,
  enriquecimento) — se adotado, adicionar `validateSearch` sanitizando caminho interno (reusar a
  lógica `safeInternalPath` da `auth`); por padrão, não implementar.

## Acessibilidade (§8)

- **Formulários (perfil/senha/carteira):** `<Label>` associado via `FormField`; erros com
  `role="alert"` ligados por `aria-describedby`; `aria-invalid` no campo com erro; campos obrigatórios
  com `aria-required`. CTA em loading: `aria-busy` + desabilitado, mensagem anterior preservada.
- **Senha:** `PasswordInput` da `auth` (mostrar/ocultar com `aria-label`/`aria-pressed`, sem perder
  foco). E-mail read-only com `aria-readonly`/`disabled` e rótulo explícito.
- **Sidebar:** nav semântica (`<nav aria-label="Conta">`), `aria-current="page"`; itens inertes
  (Atividade/Ofertas/…) como `aria-disabled` sem `href` (não navegáveis, não simulam sucesso, §3).
  "Sair" é `<button>`.
- **Favoritos:** cada card é link ao detalhe (reuso `NftCard` com `aria-label`); botão "Remover dos
  favoritos" com `aria-label` próprio e `aria-pressed` refletindo o estado. `EmptyState`/`ErrorState`
  anunciados.
- **Geral:** navegação 100% teclado; foco visível (ring `primary`); contraste dos tokens do Figma;
  `prefers-reduced-motion` (shimmer já respeita, foundation); responsivo 390/768/1440 sem overflow (A6).

## Critérios de aceitação

1. `/profile` renderiza o layout de conta (sidebar + form) fiel ao Figma; carrega o perfil
   (`getProfile`), edita nome/bio/avatar e salva (`updateProfile`), com sucesso refletido e
   persistente após refresh.
2. Alterar senha (`changePassword`) funciona; **senha atual incorreta** mostra erro **no campo
   "Senha atual"** (`validation`/`current`); nova senha < 8 e confirmação divergente barram no cliente.
3. E-mail é read-only; campos sem contrato (ENS/website/etc.) **não** aparecem como editáveis que
   simulam persistência (§3/§11).
4. `/wallets` lista as carteiras (`listWallets`), cadastra (`createWallet`) e edita (`updateWallet`);
   mutações reconciliam por invalidação de `keys.wallets` (A-wallets-1); validação por campo; erros da
   API mapeados sem fabricar dado. Alterações permanecem após refresh.
5. Checkout sem carteira direciona a `/wallets`; após cadastrar e voltar, o checkout vê a carteira
   (cache invalidado) e libera a seleção.
6. `/favorites` lista os NFTs favoritados (resolvidos via `getNft`), com empty state quando vazio e
   `ErrorState` em falha; cada item navega ao detalhe; remover usa `useToggleFavorite` (otimista +
   rollback), reflete na hora e reaparece em erro; alteração de preço via socket reflete no card.
7. As 3 telas só trocam o `component` da rota já registrada (sem rota-pai, sem mexer em `beforeLoad`);
   sessão expirada em qualquer uma redireciona a `/login?redirect=<rota>` via guarda.
8. Isolamento por usuário: logout/troca limpa `keys.profile`/`keys.wallets`/`keys.favorites` (via
   `queryClient.clear` da sessão); nenhum dado do usuário anterior vaza (eliminatório §11).
9. a11y: teclado, foco, labels/erros associados, mostrar/ocultar senha, itens inertes não simulam
   ação; responsivo 390/768/1440 sem overflow; skeletons shimmer sem layout shift.
10. `tsc`, `npm run lint`, `npm run test`, `npm run build` limpos; sem regressão nas suítes existentes.

## Verificação

- Dev: abrir cada rota direto (deep-link) e via `AccountMenu` do header; navegar entre elas pela
  sidebar (ativo correto, histórico ok).
- Perfil: editar nome/bio/avatar → salvar → recarregar (persiste). Alterar senha com senha atual
  errada (cenário de `validation`/`current` do mock) → erro no campo. Confirmação divergente → erro
  cliente.
- Carteiras: cadastrar principal e secundária; editar label/rede; validar erros de campo; recarregar
  (persiste). Entrar no checkout sem carteira → cair em `/wallets` → cadastrar → voltar → seleção
  liberada.
- Favoritos: favoritar NFTs no detalhe/catálogo → aparecem em `/favorites`; remover → some na hora;
  cenário de **falha de mutation** (§9.4) → rollback + toast; `?scenario=` de preço via socket →
  card atualiza. Lista vazia → empty state.
- Cenários do mock (`window.__mock` / `?scenario=`): validação de senha, falha transitória em
  salvar perfil/carteira, falha de toggle de favorito, sessão expirada em rota de conta, troca de
  usuário (sem vazamento de dados).
- Teclado/leitor de tela: tabular formulários e sidebar; erros anunciados; itens inertes não focáveis
  como ações. Responsivo 390/768/1440.

## Testabilidade (preparar p/ Playwright §9)

- Fluxos-alvo: **§9.8** (edição de perfil, avatar, senha e carteiras com erros de validação) e
  **§9.4** (favoritos: inclusão, falha de mutation e recuperação do estado).
- Expor roles/labels estáveis: labels dos campos (Nome de exibição, Bio, Avatar, Senha atual, Nova
  senha; Apelido/Endereço/Rede/Tipo da carteira), nav "Conta" com `aria-current`, botão "Remover dos
  favoritos" por NFT, `EmptyState`/`ErrorState` com texto estável. Reaproveitar `data-testid="nft-card"`
  do `NftCard` na grade de favoritos.
- Cenários que dirigem os testes: `validation`/`current` (senha errada), `validation` por campo de
  carteira, `transient` em salvar, falha no toggle de favorito, `unauthenticated` (expiração), ≥2
  usuários (isolamento). Todos via `?scenario=`/`window.__mock`.
