# Kurio — Marketplace de NFTs

Frontend React/TypeScript que simula um marketplace de NFTs completo (descoberta, compra, conta e
tempo real) **sem backend real**: toda a camada de dados — REST **e** Socket.IO — é simulada com
**MSW** dentro do próprio bundle, inclusive em produção, o que permite publicar o app estaticamente
(Vercel) e ainda assim exercitar fluxos assíncronos, falhas determinísticas e eventos em tempo real.

> O enunciado original do desafio está em [`docs/CHALLENGE.md`](docs/CHALLENGE.md). As decisões de
> arquitetura transversais estão em [`ARCHITECTURE.md`](ARCHITECTURE.md); as dependências fora da
> stack obrigatória, em [`DEPENDENCIES.md`](DEPENDENCIES.md).

## Stack

React · TypeScript · TanStack Router · TanStack Query · Axios (REST) · Socket.IO (`socket.io-client`) ·
Tailwind CSS (v3) · shadcn/ui · MSW (v2) + `@mswjs/socket.io-binding` · Vite · Vitest (unit) ·
Playwright (E2E + regressão visual) · Lighthouse (auditoria).

## Pré-requisitos

- **Node 18.19.1** e **npm 9** (sem pnpm/yarn). As versões de algumas ferramentas estão fixadas por
  compatibilidade com Node 18 — ver [`DEPENDENCIES.md`](DEPENDENCIES.md).
- Para os testes E2E/visuais: o browser do Playwright — `npx playwright install chromium`.

## Setup

```bash
npm install
npx playwright install chromium   # só se for rodar os E2E
npm run dev                       # http://localhost:5173
```

Os mocks (MSW) sobem automaticamente no boot — não há nada para configurar nem backend para subir.

## Variáveis de ambiente

A aplicação **não exige** `.env` para rodar. Variáveis disponíveis:

| Variável | Default | Papel |
|---|---|---|
| `VITE_ENABLE_MOCKS` | `true` | Interceptação MSW (REST + Socket.IO). Mantida ligada também no build de produção — é o que viabiliza o deploy estático. Defina `false` só se for plugar um backend real. |

As variáveis `FIGMA_TOKEN`/`FIGMA_FILE_KEY` (template em `.env.example`) servem **apenas** aos scripts
de extração de design (`scripts/figma/`), não à aplicação.

## Comandos

| Comando | O quê |
|---|---|
| `npm run dev` | Dev server (Vite) com mocks. |
| `npm run build` | Type-check (`tsc -b`) + build de produção (`dist/`). |
| `npm run preview` | Serve o build de produção localmente. |
| `npm run typecheck` | Type-check de `src/` **e** de `test/e2e/` (via `tsconfig.test.json`). |
| `npm run lint` | ESLint. |
| `npm run test` | Testes unitários (Vitest, 1×). |
| `npm run test:watch` | Vitest em watch. |
| `npm run test:e2e` | Testes E2E Playwright (desktop + mobile). |
| `npm run test:e2e:ui` | Playwright em modo UI. |
| `npm run test:e2e:update` | Regenera as baselines de regressão visual. |
| `npm run audit:lh` | Auditoria Lighthouse (requer `npm run build` antes). |

## Credenciais fictícias

Semeadas em `src/mock/fixtures/users.ts`:

- **`collector@example.com`** / `password123` — Ava Collector (usuário primário).
- **`trader@example.com`** / `password123` — Beto Trader (para troca de usuário / isolamento).

Cadastro cria um usuário novo na sessão (não persiste entre resets de cenário).

## Cenários determinísticos e controle de mock

O estado dos mocks é dirigível, o que torna os fluxos de falha reproduzíveis e testáveis.

**Via URL** (aplicado no boot): `?scenario=<id>&seed=<n>` — ex.: `/?scenario=slow&seed=1`.

**Via console/automação** (`window.__mock`):

```js
window.__mock.scenario("http-5xx")  // troca o cenário (reinicia o store)
window.__mock.seed(2)               // muda a seed determinística
window.__mock.reset()               // restaura o store do cenário atual
window.__mock.current()             // { scenario, seed }
```

> Trocar de cenário em runtime **reinicia o store** (re-semeia e invalida tokens de sessão). Para
> dirigir um teste sem deslogar, aplique o cenário já na navegação (`?scenario=`), não no meio.

### Cenários (`src/mock/scenarios/registry.ts`)

`default`, `empty`, `slow`, `jitter`, `offline`, `http-5xx`, `http-4xx`, `unauthorized`,
`session-expired`, `register-conflict`, `coupon-invalid`, `coupon-expired`, `price-changed`,
`sold-out-during-purchase`, `order-timeout`, `payment-confirmed`, `payment-declined`
(+ `favorites-toggle-5xx`, auxiliar de teste).

**Cupons de cotação:** `NOPE` → inválido · `EXPIRED5` → expirado (ambos refletidos **inline** na
cotação, não como erro).

### Reproduzindo os fluxos de falha

| Quero ver… | Como |
|---|---|
| Skeletons de carregamento | `/?scenario=slow` |
| Erro de rede + retry | `/?scenario=offline` ou `http-5xx` |
| Recurso inexistente | acessar `/nft/este-nft-nao-existe` |
| Cadastro em conflito | `/register?scenario=register-conflict` |
| Sessão expira durante navegação | `/?scenario=session-expired` (TTL ~2s) |
| Cupom inválido/expirado | aplicar `NOPE` / `EXPIRED5` no carrinho |
| Preço muda durante o checkout | `/?scenario=price-changed` → adicionar ao carrinho → checkout |
| Edição esgota durante a compra | `/?scenario=sold-out-during-purchase` |
| Timeout do pedido + retomada | `/?scenario=order-timeout` |
| Pagamento confirmado / recusado | `/?scenario=payment-confirmed` / `payment-declined` |

## Testes

- **Unitários (Vitest):** contratos, mock store/handlers, camada de dados e lógica pura das features.
  `npm run test`.
- **E2E (Playwright):** os 12 fluxos do desafio (§9) em desktop (1440×900) e mobile (390×844), cada
  teste partindo de estado isolado via `?scenario=&seed=`; ver [`test/e2e/e2e.spec.md`](test/e2e/e2e.spec.md).
  `npm run test:e2e`.
- **Regressão visual:** snapshots de início/detalhe/carrinho/pagamento (baselines versionadas em
  `test/e2e/visual.spec.ts-snapshots/`). `npm run test:e2e:update` regenera.
- **Limitação conhecida:** o handshake do `socket.io-client` não completa com o
  `@mswjs/socket.io-binding` no Chromium headless; os fluxos de tempo real verificam o **efeito** por
  refetch e marcam a entrega ao vivo como `test.fixme` (ver `test/e2e/realtime-price.spec.ts`). A
  dedução/descarte de eventos por `version` é coberta por unidade em
  `src/lib/realtime/apply-events.test.ts`.

## Performance (Lighthouse)

`npm run build && npm run audit:lh` audita início e detalhe em mobile e desktop (3× mediana) e gera
[`lighthouse/REPORT.md`](lighthouse/REPORT.md) + relatórios crus em `lighthouse/reports/`. Resultado:
desktop atinge todas as metas (§10); o mobile fica abaixo em Performance — causa identificada e
justificada no relatório (LCP ancorado no FCP da SPA com MSW embutido no bundle + arte LCP externa).

## Deploy (Vercel)

Preset **Vite**; `vercel.json` já traz o **rewrite SPA** para deep-link e refresh funcionarem em
qualquer rota. Os mocks ficam ativos no build publicado (sem backend). Build: `npm run build`,
output `dist/`.

```bash
npm i -g vercel   # se necessário
vercel            # preview
vercel --prod     # produção
```

## Estrutura

```
src/
  app/          shell (header/footer), router, guards, estados de rota
  components/   ui (shadcn) + primitivos de estado/formulário
  contracts/    schemas Zod → tipos inferidos (fonte única de shapes)
  mock/         MSW: store, fixtures, handlers REST, socket, cenários
  lib/          camada de dados: http, query (keys/client), realtime, auth, cart, wallets, favorites
  features/     auth, catalog, nft-detail, cart, checkout, order-confirmation, account
  config/       env, socket
test/e2e/       specs Playwright + regressão visual + helpers
lighthouse/     runner da auditoria + REPORT.md
design/         tokens e componentes extraídos do Figma
scripts/figma/  extração de design (Node, sem deps)
docs/           CHALLENGE.md (enunciado original)
```
