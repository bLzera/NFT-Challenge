# Spec — Feature `catalog` (Fase 4)

> Segunda feature de UI da Fase 4. Entrega a **home/catálogo** da rota `/`: seção de **destaques**,
> **busca**, **filtros** (Coleção · Faixa de preço · disponibilidade), **ordenação**, **paginação** e
> a **grade de NFTs** — com **todo o estado de consulta na URL** (README §3 "Início"/"Catálogo e
> detalhe", §4 "Integração e estado", §8 "Interface/a11y", §9.1). Consome a camada de dados da Fase 3
> (`listNfts` + `keys.nft.list`/`normalizeNftQuery`) e os primitivos/rotas/shell da `foundation`
> (`src/app/foundation.spec.md`) — **não** reimplementa tokens, header, footer, estados nem a guarda.
>
> Design: `design/components/Desktop_In_cio.md` (header, hero, sidebar de filtros, banner de destaque,
> toolbar com abas + "Ordenar por", grade 3×N de cards, paginação, promos, blog) e
> `Mobile_In_cio.md` (hero, abas, grade 2 colunas, hambúrguer). Dark, Roboto Mono.

## Objetivo e fronteiras

**Entrega:**

1. **Troca o `component` da rota `/`** (hoje `PlaceholderPage`) em `src/app/router.tsx` pela tela real
   do catálogo, mantendo a rota já registrada (links tipados do header dependem dela).
2. **Seção de destaques (hero + banner "NFT em destaque")** no topo, acima da grade.
3. **Busca textual** (`q`) sobre título/coleção/criador (o mock já busca nesses três campos).
4. **Filtros combináveis** servidos pela API: **Coleção** (`collection`), **Faixa de preço**
   (`minPriceEth`/`maxPriceEth`) e **Disponibilidade** (`availability`: todos/disponível/esgotado).
5. **Ordenação** (`sort`): recentes · preço ↑ · preço ↓ · populares.
6. **Paginação** por página (`page`/`pageSize`); **mudança de qualquer filtro/busca/ordenação
   reinicia `page` para 1** (regra §3).
7. **Grade de cards** de NFT (imagem, título, preço em ETH, estado esgotado) que **linka para o
   detalhe** (`/nft/$idOrSlug` — rota da feature `nft-detail`, ainda não registrada; ver A8).
8. **Estado completo na URL** via `validateSearch` da rota `/`, casando com `normalizeNftQuery` e
   `keys.nft.list` — sobrevive a refresh e à navegação por histórico (voltar/avançar).
9. Estados de **loading (skeletons com shimmer, sem layout shift)**, **vazio**, **erro (com retry)** e
   **atualização em segundo plano**, usando os primitivos de `@/components/state`.

**Fora de escopo (não podem aparentar sucesso funcional — §3/§11):**

- **Filtro "Rede" (Ethereum/Polygon/Solana)** do Figma: **não há campo `network` no `Nft` nem suporte
  em `listNfts`** → renderizado como **não-funcional/indisponível** (A3). **Não** fabricar filtragem.
- **Contadores por coleção `(33)`/`(12)`…** e por rede `(119)`: **o mock não expõe facets/contagens**
  → **omitidos** (A4). **Não** derivar número falso do page atual.
- **Abas "Novos lançamentos"/"Em alta"** como filtros próprios: mapeadas para `sort` quando houver
  correspondência; o que não tiver contrato fica fora de escopo (A6).
- **Nav "Mercado/Criadores/Aprenda"**, **Promos** (cards "Explorar"), **Blog "Diário da Cunhagem"**,
  **Footer** editorial: decorativos/editoriais, **sem rota/contrato** → não implementados como fluxo
  (README §3 "páginas editoriais… não fazem parte"). O header/footer já vêm da `foundation`; a feature
  renderiza, no máximo, os **promos/blog como blocos estáticos de enriquecimento visual** (A7, adiável).
- **Favoritar a partir do card**, galeria, quantidade, compra: ficam em `nft-detail`/`cart`.

## Decisões

- **A1 — Catálogo é a rota `/` (troca de `component`).** A feature substitui o placeholder do
  `indexRoute` por `<CatalogScreen>`. Não cria rota paralela. Mantém `path: "/"` e adiciona
  `validateSearch` (ver Roteamento). Casa com o `activeOptions={{ exact: true }}` já usado no header.

- **A2 — Fonte única do estado = `search` da URL; sem estado de filtro em `useState`.** Todo controle
  (busca, filtros, sort, page) lê e escreve **direto no `search`** via `navigate({ search })`. Os
  componentes de UI são controlados pelo `search` normalizado. Isso garante refresh/histórico (§3) e
  que `keys.nft.list(query)` seja a mesma chave para a mesma URL (dedupe de cache + cancelamento de
  respostas obsoletas é do React Query). Entradas de texto livre (busca, min/max de preço) usam um
  **rascunho local temporário** só até o "commit" (Enter / debounce / botão "Aplicar") — mas a verdade
  continua na URL.

- **A3 — Filtro "Rede" renderizado como indisponível (não funcional).** Seguindo o padrão de `auth`
  com login social: o bloco "Rede" aparece fiel ao Figma, porém **desabilitado** (`aria-disabled`,
  sem contagens, com texto/`title` "Filtro por rede indisponível nesta demonstração"). **Não** altera a
  consulta nem aparenta sucesso (§11). Registrar como **desvio do Figma** em `ARCHITECTURE.md` (Fase 7).
  Justificativa: o contrato `Nft` não tem `network` e `ListNftsQuery` não aceita esse parâmetro;
  implementar um filtro "de araque" violaria §11 (fluxo só visual / dado fabricado).

- **A4 — Sem contadores por coleção.** As coleções vêm da lista **`COLLECTION_NAMES`** de
  `@/mock/fixtures` **não** é consumível pela UI (a UI não importa de `@/mock`). Em vez disso, a lista
  de coleções é **derivada do próprio `NftPage.items`** da consulta atual **apenas para exibir os
  nomes conhecidos** — porém **sem contagem** (o total por coleção exigiria facets que o mock não
  expõe). Os `(NN)` do Figma são **omitidos**. Decisão secundária **A4b**: a lista fixa de coleções
  (5 nomes) é **redeclarada como constante local da feature** (`COLLECTIONS`) — é dado de apresentação
  estável do catálogo de demonstração, não um shape de contrato; documentar que espelha as fixtures.
  *(Alternativa considerada e descartada: endpoint de facets — fora do escopo de contrato desta fase.)*

- **A5 — Faixa de preço: dois campos numéricos + "Aplicar" (não slider real).** O Figma mostra um
  slider decorativo. Como **não há componente de slider na base shadcn** (`@/components/ui` só tem
  input/button/…), e um slider acessível exigiria nova dependência, o MVP usa **dois inputs
  (mín./máx.) com rótulos** e um botão **"Aplicar"** que escreve `minPriceEth`/`maxPriceEth` no
  `search`. Valores ETH tratados como **string decimal** (sem aritmética de dinheiro na UI; comparação
  é no servidor via `gteEth`). O range de referência das fixtures é ~**0.05 – 4.02 ETH** (só para
  `placeholder`/hint, não para validação rígida). Representação visual do slider pode ser adicionada
  depois sem mudar o contrato de URL. *(Se um slider for desejado na revisão, adicionar
  `@radix-ui/react-slider` + registrar em `DEPENDENCIES.md`.)*

- **A6 — Abas da toolbar → `sort`.** "Todos os NFTs" = sem filtro adicional (estado base). "Novos
  lançamentos" → `sort=recent`. "Em alta" → `sort=popular`. O seletor "Ordenar por" expõe as 4 opções
  do enum (`nftSortSchema`: `recent`/`price_asc`/`price_desc`/`popular`) com rótulos pt-BR. Abas e
  seletor escrevem o **mesmo** `sort` no `search` (uma única fonte); a aba ativa reflete o `sort` atual.

- **A7 — Promos/Blog são enriquecimento estático adiável.** Fora do escopo funcional (§3). Podem ser
  renderizados como blocos **estáticos e decorativos** (sem navegação que aparente sucesso: CTAs
  "Explorar" levam ao topo da grade `/` ou são `aria-disabled`), ou **omitidos no MVP**. Decisão:
  **omitir no MVP** e focar destaques + grade + filtros; reavaliar na polidez visual (§11 fidelidade).
  Registrar como desvio consciente.

- **A8 — Link do card aponta para `/nft/$idOrSlug` (rota da feature seguinte).** `nft-detail` ainda
  **não** registrou sua rota. Para não quebrar a compilação dos links tipados, o card usa o **`slug`**
  e um `Link` tipado **só depois** que `nft-detail` registrar a rota; **até lá**, o MVP de `catalog`
  renderiza o card como navegação para `/` com destino pendente **ou** encapsula o alvo num helper
  `nftHref(nft)` que a feature `nft-detail` passa a resolver. Decisão: **o card expõe `to="/nft/$idOrSlug"`
  assumindo que `catalog` e `nft-detail` entram em sequência**; se `nft-detail` ainda não existir ao
  implementar, o card fica como `<Link to="/">`-placeholder com `data-testid` estável e a troca é
  trivial. **Flag para a thread principal confirmar a ordem** (plano: `catalog` → `nft-detail`).

- **A9 — `pageSize` fixo (não exposto ao usuário).** O Figma não tem seletor de itens por página.
  `pageSize` default (20, do `paginationParamsSchema`) é mantido; o grid desktop mostra 3 por linha e o
  mobile 2 por linha (CSS), mas o tamanho de página é do contrato. `pageSize` **não** entra como
  controle de UI, mas **é aceito no `search`** (deep-link/Playwright podem fixá-lo).

## Telas e layout

Layout desktop (`Desktop_In_cio.md`): coluna com `padding 24 120` sobre `Color/Ink (#140D0A)`, gap 96.

### Destaques (topo)

- **Hero** (`Hero`/`Frame 137`): coluna à esquerda com kicker "Bem-vindo à Kurio"
  (`Body/14 Medium`, `Color/Foreground`), título display "SEJA DONO DO FUTURO DA ARTE DIGITAL"
  (`Display/43 Bold`), subtítulo (`Body/14 Regular`, `Text/Secondary`), CTA **EXPLORAR** (`primary`,
  radius 6) que rola/foca a grade (âncora interna, sem fabricar navegação). Arte à direita
  (`Frame 136`, imagem radius 24). No mobile, empilha (`Mobile_In_cio` Hero Banner 366×190).
- **Banner "NFT EM DESTAQUE"** (sidebar `Featured NFT Banner`): card com gradiente
  `#D28A4C1a→#D28A4C08`, título `NFT EM DESTAQUE` (`Text/Accent`), selo "OFERTA LIMITADA", arte
  (radius 22). Conteúdo: **o primeiro item** do catálogo padrão (ou um item marcado) — exibe
  título + preço reais do `NftPage`, linkando para o detalhe. **Sem** dado fabricado: se a lista
  estiver vazia/carregando, mostra skeleton/placeholder do banner, não um NFT inventado.

### Barra lateral de filtros (desktop `Sidebar`)

Card `surface-card` (`#241612`), radius, `padding 20`. Três blocos (gap 40):

1. **Coleções** (`Body Large/18 Bold`, `Color/Foreground`): lista de nomes (A4) como **toggles**
   (botão/checkbox). O selecionado usa `Text/Accent`; os demais `Text/Secondary`. **Sem** `(NN)`.
   Selecionar escreve `collection` no `search`; reselecionar limpa (toggle → `undefined`).
2. **Faixa de preço** (`Body Large/18 Bold`): dois inputs (mín./máx., `inputMode="decimal"`), hint
   "Preço em ETH" (ex.: `0.05 – 4.02`), botão **Aplicar** (`primary`) → grava
   `minPriceEth`/`maxPriceEth`. Limpar deixa ambos em branco → remove da URL.
3. **Rede** (A3): bloco visível, **`aria-disabled`**, texto de indisponibilidade; **sem** interação.

No mobile, os filtros vivem atrás do **hambúrguer / botão "Filtros"** num **painel/overlay**
(ver A10 de a11y). Como não há `Sheet`/`Drawer` na base shadcn, o MVP usa o `Dialog` da foundation
como contêiner do painel de filtros no mobile (foco preso, Esc, `aria-modal` já prontos) — mesma
dependência que `auth` já usa. *(Alternativa: adicionar `vaul`/`Sheet` → registraria em
`DEPENDENCIES.md`; evitado no MVP.)*

### Toolbar + grade (desktop `Product Grid`)

- **Toolbar** (`Toolbar`): abas "Todos os NFTs / Novos lançamentos / Em alta" (A6) à esquerda;
  "**Ordenar por:** <opção>" com dropdown à direita (usar `DropdownMenu` da foundation). A aba/opção
  ativa usa `Text/Accent` + sublinhado `primary`.
- **Campo de busca**: o header já tem o afixo de busca (`Search`, hoje `Link to="/"`); esta feature
  **ativa a busca** — ao focar/clicar, abre um input (ou um campo inline no topo da grade) que grava
  `q` no `search` (commit por Enter + debounce ~300 ms). Deep-link `/?q=apes` deve funcionar e
  restaurar o valor no campo. *(Se preferir campo sempre visível acima da grade no mobile, manter
  consistente com o header.)*
- **Grade** (`Grid Rows`): cards `surface-card`, imagem radius 15, título (`Body Large/16 Regular`,
  `Color/Foreground`), preço (`Body Large/18 Bold`, `Text/Accent`). Card **esgotado**
  (`editionsAvailable === 0`) ganha um selo/overlay "Esgotado" (estado **não só por cor** — texto +
  opacidade). Desktop 3 colunas, mobile 2 colunas. Cada card é um `Link` para o detalhe (A8) com
  `alt` descritivo na imagem (§8).
- **Paginação** (`Pagination`): botões numerados + anterior/próximo. Página atual `primary`
  (fundo), demais com borda `Color/Border (#3F2319)`. Desabilita "anterior" na página 1 e "próximo"
  quando `!hasNext`. Clicar grava `page` no `search`.

> Estados não desenhados (loading/vazio/erro) seguem a foundation: **skeletons com shimmer** no lugar
> dos cards (mesmas dimensões → sem layout shift), `EmptyState` para busca sem resultado, `ErrorState`
> com retry para falha. Preservar tipografia/cores/espaços do Figma via **tokens nomeados**.

## Roteamento e navegação

- **A feature troca o `component` do `indexRoute`** e adiciona `validateSearch`. Esquema do `search`
  (casa 1:1 com `ListNftsQuery`, campos reais de `@/contracts/nft`):

  | Search param | Tipo | Default | Observações |
  | --- | --- | --- | --- |
  | `q` | string? | — | busca título/coleção/criador (mock) |
  | `collection` | string? | — | nome exato da coleção |
  | `minPriceEth` | string? | — | decimal ETH (string) |
  | `maxPriceEth` | string? | — | decimal ETH (string) |
  | `availability` | `"all"\|"available"\|"sold_out"`? | — | `all` ≡ ausente |
  | `sort` | `"recent"\|"price_asc"\|"price_desc"\|"popular"` | `recent` | enum `nftSortSchema` |
  | `page` | number | `1` | coerção de string (URL) já no schema |
  | `pageSize` | number | `20` | não exposto na UI (A9); aceito no deep-link |

- **`validateSearch`** deve **reaproveitar `listNftsQuerySchema`** de `@/contracts` (parse parcial):
  `listNftsQuerySchema.parse(search)` normaliza e coage (page/pageSize string→number, sort default).
  **Não** redeclarar os campos à mão (fonte única). Chaves ausentes/`""` são omitidas → casam com
  `normalizeNftQuery`.
- **Escrita no `search`**: helper `setSearch(patch)` que faz
  `navigate({ to: "/", search: (prev) => ({ ...prev, ...patch }) })`. **Qualquer mudança de
  `q`/`collection`/`minPriceEth`/`maxPriceEth`/`availability`/`sort` zera `page` para 1** (A regra §3);
  só a paginação preserva os demais.
- **Histórico**: voltar/avançar restaura a consulta inteira (é derivada do `search`). Refresh idem.

## Dados, hooks e mutations

Consome **apenas** `@/contracts` + `@/lib/*` (nunca Axios/handlers/`@/mock` direto; nunca redeclara
shapes de contrato):

- **Hook de leitura colado à feature** `useNftList(query)` em `src/features/catalog/` (decisão da Fase
  3: hooks por recurso ficam na feature). Internamente:
  ```
  useQuery({
    queryKey: keys.nft.list(query),      // normalizeNftQuery embutido
    queryFn: () => listNfts(query),      // @/lib/http/api
  })
  ```
  `query` é o `search` já validado por `listNftsQuerySchema`. A **mesma URL → mesma `queryKey`** →
  cache/dedupe/cancelamento de obsoletas são do React Query (política em `query-client`). **Nenhuma
  mutation** nesta feature (catálogo é read-only; favoritar/comprar são outras features).
- **ETH como string decimal**: o card exibe `priceEth` **cru** (já é string) — usar `formatEth` de
  `@/contracts/value-types` para formatação de exibição; **nunca** parseFloat/aritmética na UI.
- **Respostas fora de ordem / obsoletas** (§3/§4): garantidas pelo React Query (cada `queryKey`
  distinta; a tela renderiza sempre o resultado da chave atual). Não implementar cancelamento manual.
- **Coleções (A4)**: constante local `COLLECTIONS` (espelha as 5 fixtures) para render dos toggles;
  comentar que é dado de apresentação, não contrato.

## Tempo real (§7) — a UI só lê o cache

- `nft.updated` é aplicado pela camada de dados (`@/lib/realtime`) **em todas as entradas
  `keys.nft.list`** e em `keys.nft.detail`, com **dedupe por `version`** (confirmado em
  `apply-events.ts`/testes). A grade do catálogo **reflete preço/disponibilidade sozinha** quando o
  socket emite — **sem** nenhum código de socket na feature (eliminatório §11: nada de evento simulado
  na UI). Mudança de disponibilidade para 0 passa o card a "Esgotado" automaticamente.
- Durante a atualização em segundo plano, usar `BackgroundUpdateIndicator` (foundation) em vez de
  piscar skeleton (preserva conteúdo; §8).

## Validação e mapeamento de erros

Catálogo é leitura; os cenários são de **carga**, não de formulário. Tratados via
`@/components/state` (que já ramificam por `isApiCode(HttpError.detail, …)` — **sem dado fabricado**):

| Cenário | `code` (status) | Tratamento na UI |
| --- | --- | --- |
| Resultado vazio (busca/filtro sem match) | — (200, `items: []`) | `EmptyState` "Nenhum NFT encontrado" + ação **"Limpar filtros"** (reseta o `search`). **Não** é erro. |
| Falha transitória / rede | `transient` (503) / `network` | `ErrorState` com **retry** (`query.refetch`); preserva o `search`. |
| 4xx inesperado | outros `code` | `ErrorState` (mensagem do `error-message`), sem retry automático se não-retryable. |
| Carregando (inicial) | — | Grade de **skeletons** (mesmas dimensões dos cards; shimmer; reduced-motion). |
| Atualização em 2º plano | — | Conteúdo visível + `BackgroundUpdateIndicator`. |

Busca/preço têm **validação leve de cliente** (preço = decimal ≥ 0; min ≤ max) antes de gravar na
URL — mensagens pt-BR, **sem** bloquear a navegação por histórico. O servidor é a autoridade do
resultado.

## Acessibilidade (§8)

- **Busca**: `<label>` associado (visível ou `sr-only`), `role="searchbox"`/`type="search"`, Enter
  confirma; limpar acessível.
- **Filtros**: cada toggle de coleção é um controle rotulado (`button[aria-pressed]` ou
  `checkbox`+`label`); grupo com `fieldset`/`legend` ("Coleções", "Faixa de preço", "Rede"). Bloco
  "Rede" com `aria-disabled` + texto de indisponibilidade (não só visual — A3).
- **Ordenação/abas**: dropdown da foundation (teclado/aria prontos); aba ativa marcada por
  `aria-current` **além** da cor (estado não só por cor, §8).
- **Painel de filtros mobile** (A10): `Dialog` da foundation → foco preso, Esc fecha, `aria-modal`,
  `DialogTitle`/`DialogDescription` preenchidos; o gatilho ("Filtros") tem `aria-expanded`.
- **Cards**: imagem com `alt` = título do NFT; preço legível; selo "Esgotado" textual. Card inteiro é
  um link com nome acessível (título).
- **Paginação**: `nav[aria-label="Paginação"]`; botão da página atual com `aria-current="page"`;
  anterior/próximo com `aria-label`; estados desabilitados reais (`disabled`), não só estilo.
- **Skeletons**: `aria-hidden` + `aria-busy` na região; sem layout shift; respeitam
  `prefers-reduced-motion` (já no `index.css`).
- Navegação 100% por teclado, foco visível (ring `primary`); responsivo **390/768/1440** sem overflow
  horizontal (grade 2→3 colunas; sidebar vira painel no mobile).

## Critérios de aceitação

1. `/` renderiza destaques + toolbar + grade de NFTs reais do `listNfts`, fiel ao Figma (tokens
   nomeados), com 3 colunas no desktop e 2 no mobile, sem overflow em 390/768/1440.
2. Busca, `collection`, faixa de preço, `availability`, `sort` e `page` **vivem no `search` da URL**,
   sobrevivem a **refresh** e a **voltar/avançar** do histórico; a `queryKey` casa com
   `keys.nft.list(normalizeNftQuery(query))`.
3. Filtros são **combináveis**; mudar qualquer filtro/busca/ordenação **reinicia `page` para 1**;
   paginar preserva os demais parâmetros.
4. Resultado vazio mostra `EmptyState` com "Limpar filtros" (não erro); falha mostra `ErrorState` com
   retry; carga mostra **skeletons com shimmer sem layout shift**; atualização em 2º plano usa o
   indicador — tudo **sem dado fabricado**.
5. **Filtro "Rede" não funcional/indisponível** (A3) — presente, `aria-disabled`, sem alterar a
   consulta; **sem contadores `(NN)`** (A4). Nada aparenta sucesso (§11).
6. Cards linkam para o detalhe (A8); card esgotado (`editionsAvailable===0`) exibe estado "Esgotado"
   textual (não só cor).
7. `nft.updated` via socket reflete preço/disponibilidade na grade **sem** código de socket na feature
   (só leitura de cache; §7/§11).
8. a11y: busca/filtros/ordenação/paginação operáveis por teclado, rotulados, estado não só por cor;
   painel de filtros mobile com foco preso.
9. `tsc`, `npm run lint`, `npm run test`, `npm run build` limpos; sem regressão (81 testes verdes).

## Verificação

- Dev: `/?q=apes` restaura a busca; `/?collection=Neon%20Apes&sort=price_asc&page=2` restaura
  coleção+ordenação+página; refresh e voltar/avançar mantêm tudo. Mudar coleção com `page=3` volta
  para `page=1`.
- Vazio: buscar termo inexistente → `EmptyState` + "Limpar filtros" reseta o `search`.
- Erro/latência: `window.__mock` / `?scenario=` com falha de rede → `ErrorState` + retry recarrega;
  cenário de latência → skeletons visíveis sem layout shift.
- Tempo real: disparar `nft.updated` (via cenário do mock) para um NFT na grade → preço/esgotado
  mudam sozinhos sem reload.
- Rede indisponível: bloco "Rede" não altera resultados e é anunciado como indisponível.
- Responsivo 390/768/1440: grade 2↔3 colunas; filtros em painel no mobile; sem overflow.

## Testabilidade (preparar p/ Playwright §9.1)

- Roles/labels estáveis: `searchbox` (busca), `nav[aria-label="Paginação"]`, grupos de filtro com
  `legend`, dropdown de ordenação, abas com `aria-current`. Cards com nome acessível = título e
  `data-testid` estável (ex.: `nft-card`) para selação robusta.
- Fluxo-alvo §9.1 (busca, filtros combinados, ordenação, paginação, restauração por histórico):
  totalmente dirigível pela **URL** (deep-link) + interações; os dados vêm das fixtures
  determinísticas (30 NFTs, 5 coleções, preços 0.05–4.02, ~1/6 esgotado) → baseline estável para
  regressão visual da home (§9 "regressão visual de início").
- Cenários do mock (`?scenario=`/`window.__mock`) cobrem vazio, latência/fora de ordem, falha de
  rede/4xx-5xx e `nft.updated` — todos observáveis pela UI.
