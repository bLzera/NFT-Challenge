# Spec — Fase 5: E2E com Playwright + regressão visual

> Testes E2E executáveis sobre a aplicação real com a camada de mock (MSW REST + Socket.IO),
> cobrindo os 12 fluxos do README §9, em **Chromium** nos viewports **desktop e mobile**, cada teste
> partindo de **estado isolado** e dirigindo cenários determinísticos via `window.__mock`/`?scenario=`.
> Entrega: relatório HTML + traces das falhas e **regressão visual** de início/detalhe/carrinho/
> pagamento com baselines versionadas.

## Objetivo e fronteiras

**Entrega:**

1. `@playwright/test` **fixado em 1.55.1** (compatível com Node 18.19.1; 1.56+ exige Node 20 — ver
   DEPENDENCIES.md). Browser: Chromium (headless shell) baixado via `npx playwright install chromium`.
2. `playwright.config.ts` na raiz: `testDir: "test/e2e"`, `webServer` sobe o app (`npm run dev`,
   porta 5173, `reuseExistingServer` em dev), `baseURL`, dois projetos (**desktop** 1440×900 e
   **mobile** 390×844 — alvos do README §8), trace `on-first-retry`, screenshot/vídeo em falha,
   `reporter: [["html"], ["list"]]`.
3. Scripts no `package.json`: `test:e2e`, `test:e2e:ui`, `test:e2e:update` (atualizar baselines).
4. **Helpers/fixtures** (`test/e2e/support/`): controle de cenário/seed (`gotoWithScenario`,
   `setScenario`, `resetStore`), credenciais fictícias, login programático e por UI, seletores por
   `data-testid`, utilidades de espera determinística.
5. **12 specs** (`test/e2e/*.spec.ts`), uma por fluxo do §9 (ver mapa abaixo). Além delas,
   `smoke.spec.ts` é um **canário do harness** (não é um dos 12 fluxos): prova que o dev server + MSW +
   `window.__mock` subiram antes dos specs de comportamento rodarem.
6. **Regressão visual** (`test/e2e/visual.spec.ts`): snapshots de início/detalhe/carrinho/pagamento,
   baselines versionadas em `test/e2e/visual.spec.ts-snapshots/` (padrão do Playwright; tag de
   plataforma `-linux` no nome), com dados estáveis (seed fixa, cenário
   `default`, animações desligadas).

**Fora de escopo:** Lighthouse (Fase 6); deploy (Fase 7); testes unitários (Vitest, já cobrem
contratos/mock/lib/lógica pura das features).

## Ambiente e determinismo

- **App com mocks**: `VITE_ENABLE_MOCKS` default = ligado (`src/config/env.ts`) → dev e preview servem
  MSW. Os testes de REST passam pelos handlers MSW; os de tempo real passam pelo `socket.io-client`
  real interceptado (README §9: "tempo real pelo cliente Socket.IO, REST pelos handlers MSW").
- **Isolamento por teste**: cada teste começa navegando com `?scenario=<id>&seed=<n>` **e** chama
  `window.__mock.reset()`/`.scenario(id)` para restaurar o store a um estado conhecido antes de agir.
  Sem estado compartilhado entre testes (`fullyParallel`, mas cada um auto-contido).
- **Controle de tempo/latência**: os cenários já embutem latências e delays determinísticos
  (`registry.ts`). Para esperas, usar `expect(locator).toBeVisible()` / `toHaveText` com auto-wait do
  Playwright (nunca `waitForTimeout` fixo, exceto onde o cenário agenda um evento — aí esperar o
  efeito na UI, não um sleep).
- **API de cenário** (`window.__mock`, `src/mock/scenario.ts`): `.scenario(id)`, `.seed(n)`,
  `.reset()`, `.current()`. Também `?scenario=&seed=` na URL (aplicados no boot).

## Credenciais fictícias (fixtures `src/mock/fixtures/users.ts`)

- `collector@example.com` / `password123` (Ava Collector) — usuário primário dos testes.
- `trader@example.com` / `password123` (Beto Trader) — para troca de usuário/isolamento.

## Cupons (cotação)

- `NOPE` → inválido (`coupon.valid=false`, inline na cotação). `EXPIRED5` → expirado.

## Cenários de mock relevantes (`src/mock/scenarios/registry.ts`)

`default`, `empty`, `slow`, `jitter`, `offline`, `http-5xx`, `http-4xx`, `unauthorized`,
`session-expired`, `register-conflict`, `coupon-invalid`, `coupon-expired`, `price-changed`,
`sold-out-during-purchase`, `order-timeout`, `payment-confirmed`, `payment-declined`.

Cenário auxiliar de teste (não-§6, adicionado p/ E2E): `favorites-toggle-5xx` — falha 503 **apenas**
em `favorites.toggle`; sessão e `favorites.get` seguem OK. Necessário porque trocar de cenário em
runtime (`window.__mock.scenario`) reinicia o store e invalida o token (deslogaria o usuário),
mascarando o rollback otimista. Aplicado já na navegação, não no meio do teste.

## Mapa §9 → spec → cenário

| # | Fluxo (README §9) | Arquivo | Cenário(s) |
|---|---|---|---|
| 1 | Busca, filtros, ordenação, paginação, restauração pelo histórico | `catalog.spec.ts` | `default` |
| 2 | Acesso direto ao detalhe + recurso inexistente | `nft-detail.spec.ts` | `default`, `http-4xx`/slug inválido |
| 3 | Cadastro, login, expiração de sessão, logout, troca de usuário | `auth.spec.ts` | `default`, `session-expired`, `register-conflict` |
| 4 | Favoritos, falha de mutation e recuperação do estado | `favorites.spec.ts` | `default`, `favorites-toggle-5xx` (só o toggle falha → rollback, sem deslogar) |
| 5 | Carrinho: quantidades, remoção, cupom, persistência após refresh/login | `cart.spec.ts` | `default`, `coupon-invalid` |
| 6 | Compra completa, do catálogo ao recibo confirmado | `purchase.spec.ts` | `payment-confirmed` |
| 7 | Falha de pagamento, clique repetido, timeout com recuperação do mesmo pedido | `payment-failure.spec.ts` | `payment-declined`, `order-timeout` |
| 8 | Edição de perfil, avatar, senha, carteiras, com erros de validação | `account.spec.ts` | `default`, `validation`/`http-4xx` |
| 9 | Alteração de preço/disponibilidade via Socket.IO durante o checkout | `realtime-price.spec.ts` | `price-changed`, `sold-out-during-purchase` |
| 10 | Eventos duplicados/antigos, desconexão, retomada de pedido pendente | `realtime-recovery.spec.ts` | `order-timeout`/`payment-confirmed` |
| 11 | Navegação por teclado, foco de diálogos, validação de formulários | `a11y.spec.ts` | `default` |
| 12 | Skeletons em carregamento lento, feedback de falha e recuperação por retry | `loading-states.spec.ts` | `slow`, `http-5xx` |

Os "fluxos principais" (catálogo, detalhe, carrinho, compra) rodam em **desktop e mobile**; os demais
podem rodar só em desktop para manter o tempo de suíte razoável (documentar no config via `grep`/tags
se necessário — padrão: todos rodam nos dois projetos salvo quando o custo não compensar).

## Convenções de teste

- **Seletores**: preferir `data-testid` existentes (`nft-card`, `nft-detail`, `buy-bar`,
  `checkout-cta`, `cart`, `checkout`, `confirm-purchase`, `wallet-form`) e papéis/roles acessíveis
  (`getByRole`) — reforça o eixo a11y. Adicionar `data-testid` novos só quando necessário e registrar.
- **Asserções sobre interface e resultado** (README §9): verificar o que o usuário vê **e** o efeito
  da operação (ex.: pedido confirmado mostra recibo com txRef; toggle de favorito reflete no cache).
- **Nada de dado fabricado nos testes**: dirigir só via cenário/UI; nunca stubar respostas fora do MSW.

## Regressão visual

- `test/e2e/visual.spec.ts`: `expect(page).toHaveScreenshot()` para início (`/`), detalhe
  (`/nft/<slug conhecido>`), carrinho (`/cart` com itens), pagamento (`/checkout`). Artes/avatares
  vêm de `picsum.photos` (externo) → **mascaradas** via `mask: [img]`; ícones/logos SVG inline ficam.
- **Dados estáveis**: `?scenario=default&seed=1`, `reset()` antes do snapshot; mascarar/estabilizar
  regiões não-determinísticas (datas/tempo) com `mask` ou congelando o conteúdo; desabilitar animações
  (`prefers-reduced-motion` já tratado no `index.css`; reforçar via `page.emulateMedia`).
- Baselines versionadas; `test:e2e:update` regenera. Tolerância `maxDiffPixelRatio` pequena.

## Verificação (critério de pronto)

1. `npm run test:e2e` **verde** nos 12 arquivos, nos dois projetos (desktop/mobile) para os fluxos
   principais. Nenhum teste depende de ordem/estado de outro.
2. Testes de tempo real exercitam o caminho real do `socket.io-client` (cenários 9 e 10).
3. Relatório HTML gerado (`playwright-report/`) e traces em falha. Baselines de regressão visual
   commitadas e estáveis (re-run sem diffs).
4. É critério **eliminatório** (§11) ter E2E executável — esta fase fecha esse risco.
