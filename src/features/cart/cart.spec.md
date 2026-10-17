# Spec — Feature `cart` (Fase 4)

> Feature do **carrinho** na rota `/cart`. Entrega **listagem de itens, edição de quantidade, remoção,
> cupom de desconto, resumo de valores (cotação) e persistência** (README §3 "Carrinho", §5 "Carrinho"
> + "Cotação", §7 início do cenário crítico, §9.5). Consome a camada de dados da Fase 3
> (`getCart`/`updateCartItem`/`removeCartItem`/`createQuote`, `keys.cart`/`keys.quote`) e os
> primitivos/rotas/shell da `foundation` — não reimplementa tokens, header (badge do carrinho já lê
> `keys.cart`), estados nem a guarda de rota. A `nft-detail` já popula `keys.cart` ao adicionar; a
> `cart` passa a ser a **fonte da tela** (leitura + mutação).
>
> Design: `design/components/Desktop_Carrinho_de_NFTs.md` (tabela de itens + "Resumo da carteira")
> e `Mobile_Carrinho_de_NFTs.md` (lista de cards + "Payment Summary" em sheet inferior). Dark, Roboto Mono.

## Objetivo e fronteiras

**Entrega:**

1. Rota `/cart` (esqueleto `PlaceholderPage` hoje) com a UI real: lê o carrinho de `getCart` + `keys.cart`.
2. **Edição de quantidade** por item (`updateCartItem`) respeitando `availableEditions`, e **remoção**
   (`removeCartItem`). Servidor como verdade (A4).
3. **Cupom** de desconto: aplicar/remover via `createQuote` (`keys.quote(cartVersion, couponCode?)`).
   Código inválido/expirado é feedback **inline na cotação** (`quote.coupon.valid=false` + `reason`),
   nunca erro `conflict` (A6).
4. **Resumo de valores** (subtotal, desconto, taxa de rede, total) vindos **exclusivamente da cotação**
   — ETH como string decimal, sem aritmética de dinheiro na UI (A7).
5. **Persistência**: refresh mantém o carrinho (server-side no store do mock); a UI só reflete.
6. **Reflexo em tempo real (§7)**: `nft.updated` altera preço/disponibilidade → os itens do carrinho
   refletem (a camada de dados já patcheia `keys.cart`); a UI **sinaliza cotação desatualizada** e
   estabelece o **contrato de versão** que `checkout` usará para bloquear confirmação desatualizada (A8).
7. **Ir para checkout** (`/checkout`) — ver A2.
8. Estados **loading / vazio / erro** via `@/components/state`; **skeletons com shimmer** no resumo e na
   lista (§8), sem layout shift.

**Fora de escopo (não podem aparentar sucesso — §3/§11):**

- A **finalização do pedido** (validação de carteira/rede, `createOrder`, idempotência, recibo) é da
  feature `checkout`. A `cart` só navega para `/checkout`.
- O bloco **"Colecionadores também viram" / Related Products** (carrossel) do Figma desktop é
  **editorial/enriquecimento** — não é dado funcional do carrinho. Omitir no MVP (A3); se renderizado,
  não pode simular navegação/dados que não existem.
- A newsletter do footer e links de nav sociais seguem o comportamento já definido na `foundation`.
- O design mostra "Conectar e finalizar" (conexão de carteira) no CTA — essa simulação é da `checkout`;
  aqui o CTA apenas **navega** (A2).

## Decisões

- **A1 — `/cart` é rota PÚBLICA (visitante permitido).** Os handlers de carrinho (`src/mock/handlers/cart.ts`)
  resolvem `ownerKey` como `GUEST_OWNER_KEY` quando não há sessão; o store mescla o carrinho do
  visitante no do usuário ao autenticar (`mergeGuestCartInto`). Logo `/cart` **não** usa `requireAuth`
  — manter o `component` da rota como está registrada, sem `beforeLoad`. A proteção acontece no passo
  de checkout: `createQuote` exige sessão (`requireUser`) e `/checkout` será privada (A2). Assim o
  visitante monta o carrinho, e a autenticação é pedida só ao finalizar (fiel ao CTA "Conectar e
  finalizar" do Figma e ao README §3 "Checkout exige autenticação").
- **A2 — Registrar `/checkout` como placeholder agora (como a `catalog` fez com `/nft`).** O CTA de
  checkout precisa de um `Link` tipado do TanStack Router; links tipados exigem a rota registrada.
  Registrar `checkoutRoute` (`path: "/checkout"`, **privada** via `beforeLoad: requireAuth`) com
  `component: () => <PlaceholderPage title="Pagamento" />` no `src/app/router.tsx` e adicioná-la à
  `routeTree`. A feature `checkout` depois troca só o `component` — sem recriar a rota. **Esta é a única
  edição fora de `src/features/cart/`** e deve ser registrada em `ARCHITECTURE.md` como esqueleto
  intencional (mesmo padrão de `/nft`). Para o **visitante**, clicar em checkout cai no `requireAuth` →
  `/login?redirect=/checkout` (retomada do fluxo garantida pela `auth`).
- **A3 — Omitir "Related Products" (carrossel) no MVP.** É editorial, não faz parte do contrato de
  carrinho (§3 lista "Páginas editoriais … não fazem parte da entrega"). Registrar como desvio
  deliberado do Figma em `ARCHITECTURE.md`. Se um dia renderizado, usar `listNfts` real — nunca dados
  inventados (§11).
- **A4 — Quantidade e remoção: servidor como verdade (sem otimismo), igual à `nft-detail`.** Estoque e
  `cart.version` precisam vir do backend; aplicar `updateCartItem`/`removeCartItem` e **escrever o
  `Cart` retornado em `keys.cart`** no `onSuccess` (`setQueryData`), espelhando `use-add-to-cart`.
  `retry: 0` (um 409 de disponibilidade não é falha transitória). Justificativa: o otimismo
  obrigatório da §4 já é cumprido por `use-toggle-favorite` (favoritos) — repetir aqui arriscaria
  dessincronizar `cart.version` (que a cotação depende), então **servidor-como-verdade** é a escolha
  correta de contrato. Durante a mutação, desabilitar os controles do item e mostrar estado "ocupado"
  (sem remover o valor anterior — §8).
- **A5 — Debounce/clamp local dos stepper de quantidade.** Os botões +/− alteram um alvo local,
  **clampado** a `[1, availableEditions]` na UI (feedback imediato), e disparam `updateCartItem` com a
  quantidade resultante. Nunca enviar quantidade > `availableEditions` nem < 1. O servidor revalida e
  reclampa; se o servidor recusar (409 `availability`), a UI mostra o valor do servidor retornado (ou
  o anterior) + aviso inline. Quantidade mínima 1 (quantidade 0 = remover, via botão de remoção).
- **A6 — Cupom é feedback inline da cotação, não erro.** `createQuote({ cartVersion, couponCode })`
  sempre resolve `200` com a cotação; o cupom vem em `quote.coupon` (`{ code, valid, reason? }`). Se
  `valid=false`, a UI mostra mensagem inline ("Cupom inválido." / "Cupom expirado." conforme
  `reason`), **mantém a cotação sem desconto** e não aplica o código. Se `valid=true`, mostra o
  desconto (linha "Desconto do lançamento"). Remover cupom = refazer a cotação **sem** `couponCode`
  (chave `keys.quote(cartVersion, null)`). Cupons de fixture: `WELCOME10`/`JUNGLE20` (válidos),
  `EXPIRED5` (expirado), `NOPE` (inválido). O código é normalizado para maiúsculas pelo servidor —
  a UI pode exibir como digitado.
- **A7 — Totais vêm só da cotação; a UI não soma dinheiro.** `subtotalEth`/`discountEth`/`networkFeeEth`/
  `totalEth` são lidos de `Quote` e formatados com `formatEth` (`@/contracts` value-types). O
  `unitPriceEth` e o total de linha exibidos por item vêm da cotação (`quote.items[].unitPriceEth`/
  `lineTotalEth`) quando há cotação; enquanto a cotação carrega, mostra `cart.items[].unitPriceEth` e
  o total de linha via `mulEth(unitPriceEth, quantity)` (único uso de helper decimal permitido, não é
  "aritmética de dinheiro" ad-hoc — é o helper oficial). Desconto exibido como `(-) <valor>`; `"0"`
  quando sem cupom.
- **A8 — Contrato para o §7: a cotação é obsoleta quando preço ou quantidade de uma linha diverge do
  que foi cotado.** A camada de dados, ao aplicar `nft.updated`, patcheia **cada item** de `keys.cart`
  (`unitPriceEth`/`availableEditions`/`version`) mas **não** altera `cart.version` (confirmado em
  `src/lib/realtime/apply-events.ts`); e `quoteLineSchema` (`src/contracts/quote.ts`) **não tem**
  campo `version` — só `nftId`, `quantity`, `unitPriceEth`, `lineTotalEth`. Portanto o sinal de
  "cotação desatualizada" é a **divergência de preço/quantidade por linha** entre o carrinho e a
  cotação (não comparação de `version`): para cada `nftId`, comparar `cartItem.unitPriceEth` vs.
  `quote.items[nftId].unitPriceEth` (igualdade decimal via `eqEth`) **e** `cartItem.quantity` vs.
  `quote.items[nftId].quantity`; se qualquer um divergir → `quoteStale = true`. Uma mudança **somente
  de disponibilidade** (`availableEditions` cai sem alterar preço nem a quantidade cotada) **não** torna
  os totais obsoletos (os totais dependem de preço×quantidade) → **não** marca `quoteStale`, apenas o
  badge "disponibilidade reduzida" por item; se a disponibilidade cair abaixo da quantidade, o usuário
  ajusta a quantidade, o que muda o carrinho e refaz a cotação naturalmente. Quando `quoteStale`, a UI:
  (a) exibe aviso acessível ("O preço de um item mudou. Revise o resumo.");
  (b) **refaz a cotação** (invalida/refetch `keys.quote(cart.version, coupon)`) para o resumo refletir
  os novos valores; e (c) expõe o estado `quoteStale` (derivado da comparação linha-a-linha sobre os
  caches `keys.cart`/`keys.quote`) para a `checkout` **bloquear** a confirmação até o usuário
  reconfirmar. A `cart` não implementa o bloqueio do pedido (é da `checkout`); estabelece a regra de
  comparação e o refetch. A UI **só lê o cache** — nenhum código de socket aqui.

## Telas e layout

### Desktop (`Desktop_Carrinho_de_NFTs.md`)

- Breadcrumb "Início / Mercado / Carrinho" (`Color/Foreground`).
- **Cart Body** em `row`, `SPACE_BETWEEN`:
  - **Cart Table** (esquerda, ~782px): cabeçalho de colunas **NFTs · Preço · Edições · Total** +
    linha divisória `Color/Primary` (strokeWeight 0.3). Cada **Cart Item** (`fill: Color/Surface Card`
    `#241612`, radius 6, altura ~70): thumbnail 70×70 (radius 6, `alt` = título), título
    (`Body Large/16 Bold`, `Color/Foreground`) + "ID do token: #…" (`Color/Secondary`); preço unitário
    (`Text/Secondary`); **stepper de quantidade** (dois botões circulares `Color/Primary` radius 20
    com −/+ e o número no meio); total de linha (`Text/Accent` `#E89B55`); ícone de **remover**
    (lixeira, `Color/Secondary`).
  - **Wallet Summary** (direita, ~332px): título "Resumo da carteira" + divisória; **Código
    promocional** (input com borda `Color/Primary` radius 3 + botão "Aplicar" `Color/Primary`);
    **Fees**: Subtotal, "Desconto do lançamento" (`(-) 00.00`), "Taxa de rede" + legenda "Taxa
    estimada" (`Text/Accent`); **Total** (`Body Large/18 Bold`, `Text/Accent`); **Checkout CTA**
    ("Conectar e finalizar", `Color/Primary`, radius 3) + link "Continuar explorando" (`Text/Accent`).

### Mobile (`Mobile_Carrinho_de_NFTs.md`)

- Cabeçalho com botão voltar (ellipse `Color/Surface Raised`) + título "Carrinho de NFTs" (`Title/20 Bold`).
- **Cart Items**: cards 358×100 (`Color/Surface Card`, radius 14, sombra), imagem 100×100 à esquerda,
  título (`Body/15 Bold`), "Edição: n/total" (`Text/Secondary`), preço (`Text/Accent`), stepper
  (círculos 24×24 `Color/Surface Raised` com borda `Color/Border`, −/+). Ícone de remover.
- **Payment Summary** como sheet inferior (`fill: Color/Surface Card`, radius 40 40 0 0): Promo Input
  (radius 40, borda `Color/Border`) + "Aplicar"; Subtotal/Desconto/Taxa de rede/Total; CTA de checkout.

> Estados não desenhados (erro de API, carregando, item esgotado, cupom inválido, cotação obsoleta)
> seguem a `foundation` (`ErrorState`/`EmptyState`/`LoadingState`, skeleton shimmer, toasts; §8).
> Preservar tipografia/cores/espaços/tokens nomeados do Figma. "Edições" exibe
> `quantity`/`availableEditions` (ex.: "1/50").

## Roteamento e navegação

- `/cart` **já registrada** em `src/app/router.tsx` (hoje `PlaceholderPage`) — a feature **troca só o
  `component`** por `CartScreen` (`src/features/cart/cart-screen.tsx`). **Pública** (sem `beforeLoad`, A1).
- **`/checkout`** registrada agora como placeholder privado (A2): `beforeLoad: requireAuth(location.href)`,
  `component: () => <PlaceholderPage title="Pagamento" />`, incluída na `routeTree`.
- Sem estado de busca/filtros/paginação → **nenhum `validateSearch`** para `/cart` (o carrinho não tem
  estado de URL; é server-side). Não se aplica `normalizeNftQuery`.
- Navegações: CTA de checkout → `<Link to="/checkout">`; "Continuar explorando" / CTA do vazio →
  `<Link to="/">` (catálogo); thumbnail/título do item → `<Link to="/nft/$idOrSlug">` (detalhe).
- Navegação SPA (sem full reload) para preservar o cache de `keys.cart`/`keys.quote`.

## Dados, hooks e mutations

Consome **apenas** `@/contracts` + `@/lib/*`; nunca Axios/handlers direto; nunca redeclara shapes.

- **Leitura do carrinho:** `useCart()` (`src/features/cart/use-cart.ts`) →
  `useQuery({ queryKey: keys.cart, queryFn: getCart })`. Fonte da tela. O header já lê `keys.cart` do
  cache (via `skipToken`); ao montar a `cart`, o `queryFn` real passa a abastecer tanto a tela quanto o
  badge.
- **Cotação:** `useQuote(cartVersion, couponCode?)` (`use-quote.ts`) →
  `useQuery({ queryKey: keys.quote(cartVersion, couponCode), queryFn: () => createQuote({ cartVersion, couponCode }), enabled: cart.items.length > 0 })`.
  Chaveada por `cartVersion` (+ cupom) — refetch automático quando a versão muda. Para **visitante**,
  `createQuote` responde `unauthenticated` (A1): a UI exibe o resumo com os valores do carrinho
  calculados localmente via `mulEth`/`addEth`/`subEth` **apenas para pré-visualização** e indica que o
  total final será confirmado no checkout (sem fabricar desconto/taxa; taxa de rede não é exibida como
  confirmada). Alternativa aceitável: ocultar o resumo de desconto/taxa para visitante e habilitar só ao
  autenticar. (Escolhido: pré-visualização com subtotal real do carrinho + aviso "Entre para aplicar
  cupom e ver a taxa".)
- **Atualizar quantidade:** `useUpdateCartItem()` (`use-update-cart-item.ts`) →
  `useMutation({ mutationFn: (body: UpdateCartItemRequest) => updateCartItem(body), retry: 0, onSuccess: (cart) => queryClient.setQueryData(keys.cart, cart) })`.
  Servidor como verdade (A4) — espelha `use-add-to-cart`.
- **Remover item:** `useRemoveCartItem()` (`use-remove-cart-item.ts`) →
  `useMutation({ mutationFn: (nftId: NftId) => removeCartItem(nftId), retry: 0, onSuccess: (cart) => queryClient.setQueryData(keys.cart, cart) })`.
- **Cupom:** estado local do input (`couponCode`); "Aplicar" define `appliedCoupon` que entra na
  chave da cotação. "Remover" zera `appliedCoupon` → cotação sem cupom. O resultado (`quote.coupon`) é
  lido da cotação (A6), não há mutation separada.
- **ETH:** sempre string decimal; usar `formatEth` para exibir e `mulEth`/`addEth`/`subEth`
  (`@/contracts` value-types) quando precisar — **sem** aritmética de float ou `Number()` em dinheiro.
- **Colocação (decisão Fase 3):** todos os hooks ficam **colados à feature** em `src/features/cart/`.

## Validação e mapeamento de erros

**Carrinho (`useCart`) e mutations (`HttpError.detail`, via `isApiCode`):**

| Cenário | `code` (status) | Tratamento na UI |
| --- | --- | --- |
| Carregando carrinho | — | `LoadingState` + **skeletons shimmer** (lista + resumo), sem layout shift. |
| Carrinho vazio (`items: []`) | — | `EmptyState` ("Seu carrinho está vazio.") + CTA "Explorar o mercado" → `/`. |
| Falha transitória / rede na leitura | `transient` (503) / `network` | `ErrorState` com retry (`onRetry={() => refetch()}`; `retryable` coberto por `isRetryable`). |
| Quantidade acima das edições | `conflict` reason `availability` (409) | Aviso **inline no item** ("Quantidade acima das edições disponíveis."); UI mostra o valor do servidor/anterior, não fabrica estoque. |
| NFT/carrinho-item inexistente | `not_found` (404) | Mutation falha: toast de erro + refetch de `keys.cart` para reconciliar (o item pode ter sido removido). |
| Falha transitória na mutation | `transient` (503) / `network` | Toast de erro reversível; controles voltam ao estado anterior (sem perder o valor). |

**Cotação (`useQuote`):**

| Cenário | Fonte | Tratamento na UI |
| --- | --- | --- |
| Cupom inválido | `quote.coupon.valid=false`, `reason="invalid"` | Inline no bloco de cupom: "Cupom inválido." — resumo sem desconto (A6). **Não** é `conflict`. |
| Cupom expirado | `quote.coupon.valid=false`, `reason="expired"` | Inline: "Cupom expirado." — resumo sem desconto. |
| Cupom válido | `quote.coupon.valid=true` + `discountEth>0` | Linha de desconto exibida; opção de remover. |
| `cartVersion` não bate | `conflict` reason `price_changed` (409) | **Não deve ocorrer** em uso normal (a chave sempre usa `cart.version` atual). Se ocorrer (corrida), invalidar `keys.cart`+`keys.quote` e refazer a cotação com a nova versão; sem travar a UI. |
| Visitante sem sessão | `unauthenticated` (401) | Não tratar como expiração: mostrar pré-visualização do subtotal + aviso "Entre para aplicar cupom e ver a taxa" (A1). O 401 global faz teardown idempotente; aqui a cotação fica desabilitada até login. |
| Falha transitória / rede | `transient` (503) / `network` | Resumo em `ErrorState` compacto com retry, mantendo a lista de itens visível. |

> **Sem dado fabricado no catch (eliminatório §11):** total/desconto/taxa só aparecem como
> confirmados quando vêm de `Quote`. Para visitante a pré-visualização é rotulada como não-final.

## Tempo real (§7)

- A UI **só lê o cache**: nenhum `socket`, nenhum listener, nenhum `setQueryData` de evento nesta
  feature. A camada `@/lib/realtime` já aplica `nft.updated` em `keys.cart` (itens) e detalhe/listas.
- **Reflexo:** quando um item do carrinho recebe `nft.updated`, `useCart` re-renderiza com o novo
  `unitPriceEth`/`availableEditions`; se a quantidade atual exceder o novo `availableEditions`, a UI
  sinaliza o item (badge "Disponibilidade reduzida") e sugere ajustar — **sem** alterar o servidor
  sozinha (o usuário decide; a cotação/checkout revalidam).
- **Cotação obsoleta (A8):** comparar, por `nftId`, **preço e quantidade** entre o carrinho e a
  cotação — `cartItem.unitPriceEth` vs. `quote.items[nftId].unitPriceEth` (via `eqEth`) e
  `cartItem.quantity` vs. `quote.items[nftId].quantity`. `quoteLineSchema` não tem `version`, então a
  detecção é por preço/quantidade, nunca por `version`. Se qualquer um divergir → estado `quoteStale`:
  aviso acessível (`aria-live="polite"`) + **refetch** de `keys.quote(cart.version, coupon)` para o
  resumo refletir. Mudança **somente de disponibilidade** (sem alterar preço nem a quantidade cotada)
  **não** marca `quoteStale` (os totais dependem de preço×quantidade) — só o badge "disponibilidade
  reduzida" por item. Esse `quoteStale` é o contrato que a `checkout` lê para **bloquear** a
  confirmação desatualizada; a `cart` não cria o pedido.

## Acessibilidade (§8)

- Stepper de quantidade: botões com `aria-label` ("Diminuir quantidade" / "Aumentar quantidade"), valor
  anunciado; desabilitar "−" em `quantity=1` e "+" em `quantity>=availableEditions` (`aria-disabled`);
  mudança de quantidade anunciada via `aria-live`.
- Botão **remover**: `aria-label` ("Remover <título> do carrinho"); confirmação não obrigatória, mas a
  ação é reversível pela re-adição (sem diálogo destrutivo no MVP).
- Input de cupom com `<label>` associado; mensagem de resultado (válido/inválido/expirado) ligada via
  `aria-describedby` com `role="status"`/`role="alert"` conforme o caso; estado não só por cor.
- Thumbnails com `alt` = título do NFT; totais com rótulos textuais (não só cor para desconto/total).
- Resumo e lista com **skeleton shimmer** preservando dimensões (sem layout shift); respeitar
  `prefers-reduced-motion` (já no `index.css`).
- Mutations com feedback acessível (toast + `aria-busy` nos controles do item em voo).
- Teclado 100%: steppers, cupom, remover, CTAs operáveis; foco visível (ring `primary`); responsivo
  390/768/1440 sem overflow horizontal.

## Critérios de aceitação

1. `/cart` renderiza a lista de itens de `getCart`/`keys.cart` fiel ao Figma (desktop tabela + resumo;
   mobile cards + sheet), com tokens nomeados; é **pública** (visitante acessa).
2. Alterar quantidade chama `updateCartItem`, escreve o `Cart` retornado em `keys.cart`, respeita
   `availableEditions` (não envia > disponível nem < 1) e reflete no badge do header.
3. Remover item chama `removeCartItem`, atualiza `keys.cart`; carrinho vazio mostra `EmptyState` + CTA
   para o catálogo.
4. Aplicar cupom válido (`WELCOME10`/`JUNGLE20`) mostra desconto; `EXPIRED5`/`NOPE` mostram mensagem
   inline ("expirado"/"inválido") **sem** desconto e **sem** erro `conflict`; remover cupom refaz a
   cotação sem desconto.
5. Subtotal/desconto/taxa/total vêm de `Quote` (ETH string decimal via `formatEth`); a UI não faz
   aritmética de dinheiro ad-hoc; nenhum valor confirmado é fabricado no catch.
6. Refresh mantém o carrinho (server-side); a UI reflete sem reconstruir estado local.
7. `nft.updated` em um item do carrinho atualiza preço/disponibilidade na tela (só lê o cache) e, se a
   cotação ficar obsoleta (A8), mostra aviso acessível + refaz a cotação; o estado `quoteStale` fica
   disponível para a `checkout`.
8. CTA de checkout navega para `/checkout` (registrada como placeholder privado); visitante é levado a
   `/login?redirect=/checkout` e retorna após autenticar.
9. Estados loading (skeleton shimmer sem layout shift), vazio e erro (com retry em transitório/rede)
   via `@/components/state`; a11y de stepper/cupom/remover (teclado, labels, foco, estados não só por
   cor).
10. `tsc`, `npm run lint`, `npm run test`, `npm run build` limpos; sem regressão (suíte da base verde).

## Verificação

- Dev: adicionar itens pela `nft-detail`, abrir `/cart` → itens aparecem; alterar quantidade/remover →
  resumo e badge atualizam; refresh → carrinho persiste.
- Cupom: digitar `WELCOME10` → desconto aplicado; `EXPIRED5` → "Cupom expirado." inline; `NOPE` →
  "Cupom inválido." inline; remover → resumo sem desconto.
- Visitante (sem login): montar carrinho; resumo em pré-visualização com aviso de login; clicar em
  checkout → `/login?redirect=/checkout`; autenticar → carrinho mesclado (server-side) e `/checkout`.
- Cenários do mock (`window.__mock` / `?scenario=`): `nft.updated` (preço/estoque muda) com item no
  carrinho → tela reflete e cotação é refeita/sinalizada; cenário de latência/erro no `getCart` →
  `LoadingState`/`ErrorState` com retry; quantidade acima do estoque → aviso inline `availability`.
- Teclado: operar stepper, cupom, remover e CTAs; foco visível; sem overflow em 390/768/1440.

## Testabilidade (preparar p/ Playwright §9.5 e §9.9)

- Expor roles/labels estáveis: região do carrinho, cada item com nome acessível (título do NFT),
  botões "Aumentar/Diminuir quantidade" e "Remover …", input "Código promocional" + "Aplicar", linhas
  "Subtotal/Desconto/Taxa de rede/Total", CTA de checkout e "Explorar o mercado" (vazio).
- Fluxos-alvo: **§9.5** (carrinho: quantidades, remoção, cupom, persistência após refresh/login) e o
  início de **§9.9** (alteração de preço/disponibilidade via Socket.IO refletindo no carrinho +
  cotação obsoleta sinalizada). Dirigíveis por cenário do mock + reset determinístico.
