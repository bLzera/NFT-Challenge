# Extração de design do Figma — referência

Scripts que puxam o design do Figma (arquivo **"Marketplace de NFTs GreenMint"**) via
REST API e geram documentação estruturada em `design/`. Servem para ler cores, espaçamentos,
bordas, tipografia e assets **com valores exatos**, sem inspecionar o Figma na mão.

> Toda a saída fica em `design/` na raiz do projeto. Os scripts podem ser re-executados a
> qualquer momento; eles sobrescrevem a saída com o estado atual do arquivo no Figma.

---

## Pré-requisitos

Variáveis em `.env` na raiz (já configurado; `.env` está no `.gitignore`):

```
FIGMA_TOKEN=figd_...        # Personal Access Token (read-only)
FIGMA_FILE_KEY=Ff0SksUi7UFtPWUO8kyNtw
```

Node 18+ (usa `fetch` nativo, sem dependências). Nenhum `npm install` é necessário.

---

## Comandos

```bash
# Lista todas as telas (frames top-level) e seus node-ids
node scripts/figma/extract.mjs --list

# Extrai TODAS as telas -> design/components/*.md  +  design/tokens.md
node scripts/figma/extract.mjs

# Extrai uma tela só (node-id no formato do link do Figma, ex.: 2-2)
node scripts/figma/extract.mjs --node 2-2

# Baixa os ícones (SVG) únicos de todo o arquivo, dedup por nome
node scripts/figma/assets.mjs --all-icons
node scripts/figma/assets.mjs --all-icons --raw   # inclui formas decorativas (Stroke/Line/...)

# Baixa assets de UMA tela: vetores como SVG, imagens como PNG @2x/@3x
node scripts/figma/assets.mjs --node 2-2
node scripts/figma/assets.mjs --node 2-2 --svg          # só SVG
node scripts/figma/assets.mjs --node 2-2 --png 2,3      # só PNG, escalas 2x e 3x
```

### Telas disponíveis (snapshot de 2026-10-17 — rode `--list` para confirmar)

| node-id | Tela | | node-id | Tela |
|---|---|---|---|---|
| `2-2`     | Desktop / Início            | | `9-1670`  | Desktop / Carteiras |
| `10-244`  | Desktop / Detalhes do NFT   | | `14-5226` | Mobile / Início |
| `11-1278` | Desktop / Carrinho de NFTs  | | `15-5536` | Mobile / Detalhes do NFT |
| `11-2862` | Desktop / Pagamento         | | `16-360`  | Mobile / Carrinho de NFTs |
| `11-4385` | Desktop / Confirmação Pedido| | `16-748`  | Mobile / Pagamento |
| `9-115`   | Desktop / Login             | | `16-1022` | Mobile / Login |
| `9-1022`  | Desktop / Cadastro          | | `16-1228` | Mobile / Cadastro |
| `9-1238`  | Desktop / Perfil Colecionador| | | |

---

## Saída 1: `design/tokens.md` — design system global

Agregado de **todos** os styles nomeados do Figma, com o valor resolvido (primeira ocorrência).
Duas tabelas:

**Cores** — `Token` é o nome do style no Figma; `Valor` é o hex.

```
| Token            | Valor   |
| `Color/Primary`  | #D28A4C |
| `Color/Ink`      | #140D0A |
```

- Hex em maiúsculas. Se a cor tiver alpha < 1, vem como `#RRGGBBAA` (8 dígitos).
- A hierarquia no nome (`Color/…`, `Text/…`, `Logo/…`) é a organização de styles do próprio Figma.

**Tipografia** — `Style` é o nome do text style; `Specs` é `Família Peso / Tamanho / lh / ls`.

```
| Style                   | Specs                                        |
| `Heading/24 Bold`       | Roboto Mono 700 / 24px / lh 32px / ls 0      |
```

- `lh` = line-height em px. `ls` = letter-spacing (px, arredondado a 2 casas; `0` = padrão).
- Peso é o `fontWeight` numérico (400/500/700).

---

## Saída 2: `design/components/<Tela>.md` — árvore de cada tela

Uma lista aninhada que espelha a hierarquia de nós do Figma. **Indentação (2 espaços por nível)
= profundidade na árvore.** O nó raiz é o frame da tela.

Exemplo real (recortado):

```
- **Login Button** `FRAME` — 100×35
  - layout: column
  - gap: 10
  - justify: CENTER
  - align: CENTER
  - fill: #D28A4C (Color/Primary)
  - radius: 6
  - **Login** `TEXT` — 44×21
    - fill: #140D0A (Color/Ink)
    - text: Roboto Mono 700 16px / lh 21px / ls 0
    - textStyle: Body Large/16 Bold · lh auto
    - content: Login
```

Linha de cada nó: `**<nome>** \`<TIPO>\` — <largura>×<altura>`.
`<TIPO>` é o tipo do nó no Figma (`FRAME`, `TEXT`, `INSTANCE`, `VECTOR`, `ELLIPSE`, `LINE`, `GROUP`, …).
O tamanho vem do bounding box, arredondado a inteiro.

Um nó só aparece se tiver algo visual (fill, stroke, texto, auto-layout, efeito ou raio) — ou se
for o frame raiz. Nós puramente organizacionais sem estilo são omitidos.

### Campos possíveis por nó

Só aparecem quando existem no nó:

| Campo | Significado | Formato / valores |
|---|---|---|
| `layout` | Direção do auto-layout | `row` (horizontal) ou `column` (vertical) |
| `gap` | Espaço entre filhos (itemSpacing) | px. Só aparece se > 0 |
| `padding` | Preenchimento interno | `T R B L` em px, nesta ordem (top, right, bottom, left) |
| `justify` | Alinhamento no eixo principal | `MIN` \| `CENTER` \| `MAX` \| `SPACE_BETWEEN` |
| `align` | Alinhamento no eixo cruzado | `MIN` \| `CENTER` \| `MAX` \| `BASELINE` |
| `fill` | Preenchimento(s) | lista de `#HEX (Nome do Style)`; ver "Como ler cores" |
| `stroke` | Borda(s) | mesmo formato de `fill` |
| `strokeWeight` | Espessura da borda | px |
| `strokeAlign` | Posição da borda | `INSIDE` \| `OUTSIDE` \| `CENTER` |
| `radius` | Raio de canto | número único, ou `tl tr br bl` se cada canto difere |
| `effects` | Sombras / blur | `DROP_SHADOW: x<n> y<n> blur<n> spread<n> #HEX` ou `LAYER_BLUR: <n>` |
| `text` | Specs tipográficas | `Família Peso Tamanhopx / lh <n>px / ls <n>` |
| `textStyle` | Nome do text style aplicado | casa com a tabela de Tipografia do `tokens.md` |
| `content` | Texto literal do nó | primeiros 80 caracteres |
| `opacity` | Opacidade do nó | 0–1, só aparece se < 1 |

### Como ler cores (`fill` / `stroke`)

- **Sólida**: `#RRGGBB (Color/Nome)` — o hex é o valor final; o nome entre parênteses é o style
  do Figma (casa com a tabela do `tokens.md`). Prefira referenciar o **token** no código.
- **Com alpha**: hex de 8 dígitos `#RRGGBBAA`.
- **Gradiente**: `GRADIENT_LINEAR [#AAA → #BBB]` (lista as paradas em hex).
- **Imagem**: `IMAGE (ref: <hash>)` — o nó usa uma imagem como fill; exporte-o via `assets.mjs`.
- `fill`/`stroke` são listas: um nó pode ter mais de um paint empilhado (a ordem é a do Figma).

---

## Saída 3: `design/assets/` — assets exportados

```
design/assets/
  svg/   # ícones e vetores (escala 1x, vetorial)
  png/   # imagens raster, sufixo @2x / @3x
```

- Nome do arquivo = nome do nó no Figma, sanitizado (`[^\w-]` → `_`).
- **Colisão de nomes**: nós diferentes com o mesmo nome recebem o `id` anexado para não
  sobrescrever um ao outro.
- `--all-icons` deduplica por nome (o mesmo "Search Icon" repetido em várias telas vira 1 arquivo)
  e, sem `--raw`, filtra formas decorativas cruas (`Stroke 1`, `Line 3`, `Rectangle`, `Vector`…).
- Nós que o Figma não consegue renderizar isolados (ex.: máscaras/`Clip`) aparecem como
  `(sem imagem)` no log e não geram arquivo.

> As **artes de NFT** não são tratadas como assets fixos — são dados mockados. Por isso o
> conjunto versionado de assets é só o de ícones (`--all-icons`).

---

## Notas de precisão

- Todos os valores vêm da REST API do Figma — são os **valores reais do design**, não medições
  por cima de imagem.
- Cores da API vêm em RGBA float (0–1) e são convertidas para hex pelos scripts.
- Este arquivo usa Figma **Styles** (funciona em qualquer plano). Se o arquivo migrar para
  **Variables** (tokens com modes/light-dark), elas exigem a API de Variables (plano Enterprise);
  nesse caso os scripts caem no valor resolvido do nó — o hex continua exato, só o nome do token
  pode não vir.
- Fonte do design: **Roboto Mono** em todos os text styles.

## Arquivos

- `extract.mjs` — tokens + árvore das telas (`design/tokens.md`, `design/components/*.md`)
- `assets.mjs` — download de SVG/PNG (`design/assets/`)
- `lib.mjs` — helpers (cliente da API, conversão de cor → hex, parse de link/node-id)
