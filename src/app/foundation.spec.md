# Spec — Fundação de UI (Fase 4.0)

> Camada transversal que **todas** as features da Fase 4 consomem. Escrita e aprovada antes de
> `auth`. Não é uma feature: não tem fluxo de usuário próprio — entrega o sistema visual (tokens +
> tipografia), o shell/header definitivos, os primitivos compartilhados (estados, skeleton, campos
> de formulário) e os mecanismos de rota (guarda de rota privada + 404). Features posteriores só
> **consomem** o que está aqui; nenhuma feature redeclara tokens, re-geometriza o header nem
> reinventa estados de loading/erro.
>
> Fonte de design: `design/tokens.md` (27 cores + 54 text styles, todos Roboto Mono) e
> `design/components/*.md` (ver `scripts/figma/README.md` para o formato). Design é **dark-only**.

## Objetivo e fronteiras

**Entrega:**

1. Tokens de cor e tipografia ligados ao `tailwind.config.ts` + `src/index.css` (vars shadcn).
2. Fonte **Roboto Mono** carregada localmente (self-hosted, sem CDN em runtime — §8 pede fontes
   acessíveis à execução local e o Lighthouse §10 não pode depender de rede externa).
3. Shell/header definitivo do Figma (wordmark KURIO, nav, busca, carrinho com badge, slot de
   conta/login) + footer, responsivos 390/768/1440.
4. Primitivos compartilhados em `src/components/`: blocos de estado (loading/vazio/erro),
   `Skeleton` com shimmer sem layout shift, `FormField` (label + erro associados), e os componentes
   shadcn base adaptados à identidade.
5. Mecanismos de rota reutilizáveis: helper `requireAuth` (guarda `beforeLoad`) e rota 404.

**Fora de escopo (ficam nas features):** qualquer tela/fluxo de usuário (login, catálogo, etc.), os
dados reais do header (contagem do carrinho, usuário logado) são **plugados** pelas features via os
slots que esta spec define; aqui o header renderiza com dados derivados do cache quando existirem e
com fallback neutro quando não.

## Decisões (aprovadas)

- **D1 — Spec de fundação primeiro.** Theme + shell + primitivos saem numa spec dedicada antes de
  `auth`; cada feature seguinte só consome. Mantém `auth` enxuta e evita que uma feature "possua" o
  header ou o tema.
- **D2 — Dark-only.** O design tem um único tema (fundo `Color/Ink #140D0A`). Aplicamos a classe
  `dark` no `<html>` permanentemente e definimos os tokens no bloco `.dark` (e espelhamos em
  `:root` para robustez). Não há alternância de tema.
- **D3 — Mantemos a indireção `hsl(var(--token))` do shadcn.** Os hexes do Figma são convertidos
  para triplas HSL e guardados nas CSS vars; as chaves semânticas do shadcn continuam funcionando.
  Cores específicas do design que não têm equivalente semântico ganham **tokens próprios** no
  `theme.extend.colors` (não sequestramos a semântica do shadcn para elas).
- **D4 — Roboto Mono self-hosted** via `@fontsource/roboto-mono` (pesos 400/500/700), importada no
  `main.tsx`/`index.css`. É a única família; vira `font-sans` e `font-mono` (o app inteiro é mono).

## Tokens de cor → tailwind/shadcn

Todas as 27 cores de `design/tokens.md` ficam disponíveis. Mapeamento semântico (shadcn) + tokens
próprios. Implementação converte cada hex para HSL e grava em `src/index.css`; a tabela abaixo é o
**contrato** (não reinterpretar hexes).

### Semânticos shadcn (CSS vars)

| Var shadcn | Token Figma | Hex | Uso |
| --- | --- | --- | --- |
| `--background` | `Color/Ink` | `#140D0A` | fundo da página |
| `--foreground` | `Color/Foreground` | `#F5F1EB` | texto base |
| `--card` / `--popover` | `Color/Surface Card` | `#241612` | cards, modais, popovers |
| `--card-foreground` / `--popover-foreground` | `Color/Foreground` | `#F5F1EB` | texto sobre card |
| `--primary` | `Color/Primary` | `#D28A4C` | botões/ações primárias, destaque |
| `--primary-foreground` | `Color/Ink` | `#140D0A` | texto sobre primary |
| `--secondary` | `Color/Surface Raised` | `#2F1D15` | superfícies elevadas, botão secundário |
| `--secondary-foreground` | `Color/Foreground` | `#F5F1EB` | texto sobre secondary |
| `--muted` | `Color/Surface Raised` | `#2F1D15` | fundos sutis, inputs |
| `--muted-foreground` | `Color/Secondary` | `#B39463` | texto auxiliar, placeholder |
| `--accent` | `Color/Surface Dark` | `#38220F` | hover/estados de realce de superfície |
| `--accent-foreground` | `Color/Foreground` | `#F5F1EB` | texto sobre accent |
| `--destructive` | `Color/Error` | `#ED1B2E` | erro/destrutivo |
| `--destructive-foreground` | `Color/Foreground` | `#F5F1EB` | texto sobre destructive |
| `--border` | `Color/Border` | `#3F2319` | bordas, divisores |
| `--input` | `Color/Border` | `#3F2319` | borda de input |
| `--ring` | `Color/Primary` | `#D28A4C` | anel de foco |

### Tokens próprios (`theme.extend.colors`, sem var shadcn)

Para cores do design que são semanticamente específicas e evitam abuso das chaves shadcn:

| Classe tailwind | Token Figma | Hex | Uso |
| --- | --- | --- | --- |
| `ink` | `Color/Ink` | `#140D0A` | alias explícito do fundo |
| `surface-card` | `Color/Surface Card` | `#241612` | card |
| `surface-raised` | `Color/Surface Raised` | `#2F1D15` | superfície elevada |
| `surface-dark` | `Color/Surface Dark` | `#38220F` | superfície profunda |
| `accent-text` | `Text/Accent` | `#E89B55` | **texto** de destaque (preço, link ativo) |
| `secondary-text` | `Text/Secondary` | `#CFB28C` | texto secundário |
| `coral` | `Text/Coral` | `#F0805F` | realce/separador de abas |
| `success` | `Color/Success` | `#00A66C` | confirmação (pedido confirmado) |
| `error` | `Color/Error` | `#ED1B2E` | erro (= destructive; alias p/ legibilidade) |
| `amber` | `Color/Amber` | `#E3A44E` | realce alternativo |
| `border-soft` | `Color/Border Soft` | `#55321F` | borda suave |

> **Nota `accent` vs `accent-text`:** no shadcn `accent` é cor de *superfície* (hover). O
> `Text/Accent #E89B55` do Figma é cor de *texto* — vira o token próprio `accent-text`. Não
> confundir: botões usam `primary`; textos em laranja (preço, item de nav ativo) usam `accent-text`.

As cores `Logo/*` (Google/Facebook/etc.) **não** entram no tema — são usadas apenas inline nos SVGs
dos ícones sociais de `design/assets/svg/`.

## Tipografia → tailwind

- **Família:** Roboto Mono (self-hosted, D4). `fontFamily.sans = fontFamily.mono = ['"Roboto Mono"',
  'ui-monospace', 'monospace']`. Aplicada no `body`.
- **Escala:** os 54 text styles do Figma colapsam numa escala por tamanho com line-height default
  (peso e letter-spacing vêm de utilitários `font-*`/`tracking-*` por componente, não da escala).
  Extensão em `theme.extend.fontSize` (`[fontSize, { lineHeight }]`):

  | Chave | px / lh | Origem (Figma) |
  | --- | --- | --- |
  | `display` | 43 / 70 | `Display/43 Bold` (banner auth/início) |
  | `display-sm` | 32 / 42 | `Display/32 Bold` |
  | `heading` | 28 / 37 | `Heading/28 Bold` |
  | `heading-sm` | 24 / 32 | `Heading/24 Bold` |
  | `title` | 20 / 28 | `Title/20` (títulos de modal/seção) |
  | `body-lg` | 18 / 24 | `Body Large/18` |
  | `body` | 16 / 21 | `Body Large/16` (corpo padrão) |
  | `body-sm` | 15 / 20 | `Body/15` |
  | `label` | 14 / 18 | `Body/14` (labels, inputs) |
  | `caption` | 13 / 16 | `Caption/13` |
  | `caption-sm` | 12 / 16 | `Caption/12` |
  | `tiny` | 10 / 13 | `Tiny/10` (badge do carrinho) |

  Variações de line-height pontuais (ex.: `lh 40` das listas de filtro) são aplicadas com
  `leading-*` no componente; não poluem a escala global.

## Fonte e assets

- `@fontsource/roboto-mono` (400/500/700) importado uma vez no bootstrap. Sem `<link>` para Google
  Fonts (evita dependência de rede em runtime/Lighthouse/checkout limpo — §8/§10/§12).
- Ícones: consumir os SVGs já extraídos em `design/assets/svg/` como componentes React (via
  `vite-plugin-svgr` **ou** wrappers simples) — definir o mecanismo na implementação; o `currentColor`
  deve ser respeitado para que `fill`/`stroke` herdem a cor do texto quando aplicável.

## Shell / Header / Footer (`src/app/shell.tsx` + `src/app/`)

Substitui o placeholder atual. Estrutura do Figma (`Header Row` em Login/Cadastro/Início):

- **Header** (sticky no topo, `border-b border-border`, fundo `ink`):
  - **Wordmark KURIO** (`Body/14 Bold`, `foreground`) — link para `/`.
  - **Nav** (gap 40): `Início`, `Mercado`, `Criadores`, `Aprenda`. Item ativo em `accent-text` com
    sublinhado `primary` (3px). Só `Início`/`Mercado` levam a rotas reais (catálogo); `Criadores`/
    `Aprenda` são fora de escopo (§3) — renderizam como itens **não-funcionais coerentes** (sem
    simular sucesso: `aria-disabled`/sem navegação, ou rota de "em breve"); decisão final na
    implementação, mas **não podem aparentar funcionar**.
  - **Ações** (gap 28, centralizadas): ícone de busca (abre/foca a busca do catálogo),
    ícone de carrinho com **badge** de contagem, e **slot de conta**:
    - sem sessão → botão **Entrar** (`primary`) que navega para `/login?redirect=<rota atual>`.
    - com sessão → menu de conta (avatar/displayName) com Perfil, Carteiras, Favoritos, Sair.
  - **Dados do header vêm do cache** (fonte única): sessão via `keys.session`, contagem do carrinho
    via `keys.cart` (quando a feature `cart` existir). A fundação lê o cache de forma tolerante: se a
    query não existe ainda, mostra o fallback (badge oculto, botão Entrar). Nenhuma feature "injeta"
    estado no header por props globais.
- **Footer**: versão simplificada coerente com o design (links sociais de `design/assets/svg/`);
  links externos/fora de escopo não aparentam sucesso funcional (§3).
- **Responsividade:** 1440 (nav completa), 768 (nav condensada), 390 (nav colapsa em menu/drawer com
  foco preso — ver Mobile_*.md). Sem overflow horizontal; `container` já centralizado no tailwind.

## Primitivos compartilhados (`src/components/`)

Todos adaptados à identidade (dark + Roboto Mono + radius do design). Base shadcn a **gerar/ajustar**:
`button`, `input`, `label`, `form`, `dialog`, `dropdown-menu`, `skeleton`, `badge`, `separator`,
`tooltip`, `sonner` (toasts). Além dos shadcn, primitivos próprios:

- **`Skeleton` + shimmer**: usa a keyframe `shimmer` já no `tailwind.config`. **Sem layout shift** —
  o skeleton ocupa exatamente as dimensões do conteúdo real. **Respeita `prefers-reduced-motion`**
  (já tratado em `src/index.css`): com movimento reduzido, o shimmer é suprimido e fica um fundo
  estático. Exportar variações compostas conforme necessário (card de NFT, linha de resumo), mas o
  primitivo base e a regra "mesma dimensão do conteúdo" são definidos aqui.
- **Blocos de estado** (`<StateBlock>` ou conjunto `Loading/Empty/ErrorState`): padronizam os quatro
  estados que o README §4 exige em toda tela dependente de dados — **loading, vazio, erro, sucesso** +
  indicação de **atualização em segundo plano**. O bloco de erro recebe o `HttpError`/`ApiRequestError`
  e oferece **retry**; o conteúdo da mensagem ramifica por `isApiCode(detail, ...)` de
  `@/lib/http/errors` (§ nunca fabricar dado no catch). Feedback acessível: `role="status"` /
  `aria-live` para loading e mudanças em tempo real; erros com `role="alert"`.
- **`FormField`**: wrapper sobre `label`+`input`+mensagem de erro com `aria-describedby`/
  `aria-invalid` ligados (§8: labels e mensagens de erro associadas aos campos). Usado por auth,
  perfil, senha, carteiras. Integra com o resolver de formulário escolhido (react-hook-form + zod
  dos `@/contracts` — a definir na implementação, mas o `FormField` precisa expor `error`/`id`).
- **`ToastProvider`/feedback de mutation**: ponto único para feedback acessível de mutations e de
  eventos em tempo real (§8). Montado no shell.

## Mecanismos de rota (`src/app/`)

- **`requireAuth` (guarda `beforeLoad`)**: helper que lê `keys.session` do `queryClient` (fonte
  única; sessão derivada de `GET /api/auth/session`, já no cache após `bootSession`). Se não houver
  sessão, `throw redirect({ to: '/login', search: { redirect: <href atual> } })`. Rotas privadas
  (checkout, perfil, carteiras, favoritos, pedidos — §3) consomem este helper. A **implementação do
  login e o consumo do `redirect`** ficam na spec `auth`; a fundação entrega só o mecanismo + o
  contrato do search param `redirect`.
- **Rota 404 / not-found**: `notFoundComponent` no router para rotas inexistentes e acesso direto
  inválido (§4), no padrão visual do design.
- **Boundary de erro de rota**: `errorComponent` padrão para erros não tratados, com retry.

> A guarda **não busca** a sessão (isso é do bootstrap `bootSession()` em `main.tsx`, já existente);
> ela só lê o cache e decide. Assim refresh em rota privada funciona: o boot revalida o token antes
> do primeiro render e a guarda vê a sessão.

## Acessibilidade e responsividade (fundações)

- Foco visível (`--ring` = `primary`) em todos os interativos; navegação por teclado; foco preso em
  `dialog`/`dropdown`/drawer (shadcn/Radix já garante, validar).
- `prefers-reduced-motion` respeitado (shimmer e animações) — já em `src/index.css`.
- Contraste: paleta dark do Figma; validar `foreground`/`secondary-text` sobre as superfícies ≥ AA
  para texto normal (documentar qualquer ajuste vs. Figma em `ARCHITECTURE.md` — §8).
- Sem overflow horizontal em 390/768/1440; imagens com `alt`; estados não dependem só de cor.

## Critérios de aceitação

1. `tailwind.config.ts` + `src/index.css` expõem **todas** as 27 cores (semânticas + próprias) e a
   escala tipográfica; nenhum hex cru espalhado em componentes — tudo via token/classe.
2. Roboto Mono carrega **sem rede externa** (self-hosted) e é a fonte de todo o app.
3. Header/footer do Figma renderizam responsivos (390/768/1440) sem overflow; item de nav ativo,
   badge do carrinho e slot de conta/login presentes; ações fora de escopo não aparentam sucesso.
4. Header deriva sessão/carrinho **do cache** (tolerante à ausência das queries), sem props globais.
5. `Skeleton` com shimmer **sem layout shift** e com fallback estático em reduced-motion.
6. Blocos de estado (loading/vazio/erro+retry/background) disponíveis, acessíveis (`aria-live`/
   `role=alert`), e ramificando erro por `isApiCode` — **sem dado fabricado**.
7. `FormField` liga label↔input↔erro via aria; `requireAuth` e rota 404 funcionam (refresh em rota
   privada mantém sessão; rota inexistente cai no 404).
8. `npm run build`, `npm run lint`, `npm run test`, `tsc` limpos (sem regressão da base de 74 testes).

## Verificação

- Dev server: app renderiza em dark com a identidade Kurio (fundo ink, primary âmbar, Roboto Mono);
  header/footer corretos nos três breakpoints (DevTools responsivo).
- Toggle de `prefers-reduced-motion` no DevTools → shimmer para; sem layout shift ao trocar
  skeleton↔conteúdo (medir com camada de latência do mock, ex.: `?scenario=slow`).
- Navegação por teclado pelo header (Tab/Shift+Tab/Enter), foco visível, foco preso ao abrir um
  `dialog` de exemplo.
- Acesso direto a rota inexistente → 404; (após `auth`) acesso a rota privada sem sessão → redirect
  para `/login?redirect=...`.
