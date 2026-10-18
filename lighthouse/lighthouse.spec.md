# Spec — Fase 6: auditoria Lighthouse (performance e qualidade)

> Auditoria Lighthouse reprodutível de **início (`/`)** e **detalhe do NFT (`/nft/<slug>`)** nos perfis
> **mobile** e **desktop**, sobre o **build otimizado** (`vite preview`) com os mocks no cenário
> `default`. Três medições por página/perfil → **mediana** por categoria. Entrega: relatórios HTML/JSON
> versionados, metas, LCP/CLS/TBT, versões das ferramentas, ambiente e condições. (README §10.)

## Objetivo e fronteiras

**Entrega:**

1. `lighthouse@12.8.2` + `chrome-launcher@1.2.2` (devDeps; 12.8.2 é o último 12.x compatível com Node
   18.19.1 — 13.x exige Node 22). Documentar em `DEPENDENCIES.md`.
2. Runner versionado `lighthouse/run.mjs` (ESM, sem framework): sobe `vite preview` do `dist/`, lança o
   Chromium (reusa o do Playwright em `~/.cache/ms-playwright/chromium-*`), roda a auditoria e encerra.
3. Script no `package.json`: `audit:lh` (assume `npm run build` feito; o runner valida `dist/`).
4. Alvos: `/` e `/nft/<slug conhecido>` (`neon-apes-1`), cada um em **mobile** e **desktop**, **3 execuções**.
5. Saídas em `lighthouse/reports/` (gitignored — artefato de rodada) + **`lighthouse/REPORT.md`**
   versionado com a mediana consolidada, métricas e condições de execução.

**Fora de escopo:** deploy (Fase 7); correções de performance além de ajustes triviais (auditar e
**reportar/justificar** primeiro, conforme §10 — otimizar só com aprovação se abaixo da meta).

## Metas (README §10, mediana de 3 execuções)

| Categoria | Meta |
|---|---:|
| Performance | ≥ 90 |
| Accessibility | ≥ 95 |
| Best Practices | ≥ 95 |
| SEO | ≥ 90 |

Registrar **LCP, CLS e TBT** por página/perfil. Justificar qualquer categoria abaixo da meta e apontar
a causa (ex.: artes de NFT servidas de `picsum.photos` — terceiro externo — afetam LCP; é o
comportamento real da entrega, **sem simplificação** para inflar a nota, conforme §10).

## Determinismo e condições

- **Build otimizado**: `npm run build` → `vite preview` (porta 4173, `--strictPort`). Mocks ligados por
  padrão (`src/config/env.ts`), então a auditoria exercita REST+SW reais da entrega.
- **Cenário**: `?scenario=default&seed=1` em ambas as URLs (estado padrão dos mocks).
- **Perfis Lighthouse**: `mobile` (throttling simulado padrão: ~Slow 4G, CPU 4×) e `desktop`
  (screenEmulation 1350×940 @1×, throttling desktop). `onlyCategories` = perf/a11y/best-practices/seo.
- **SPA**: `vite preview` faz fallback p/ `index.html`, então o deep-link `/nft/<slug>` carrega o app e
  o router resolve no cliente (o rewrite de produção é da Fase 7, Vercel).
- **Mediana**: por **categoria** (perf/a11y/best-practices/seo), a mediana das 3 execuções (menos
  sensível a outlier que a média). As **métricas** (LCP/CLS/TBT) são reportadas da **execução
  representativa** — aquela cujo score de performance é a mediana —, mantendo um conjunto de métricas
  internamente coerente com um run real (em vez de combinar medianas de runs diferentes). O runner grava
  as 3 execuções cruas.

## Saídas

- `lighthouse/reports/<página>-<perfil>-run<n>.{html,json}` — relatórios crus por execução (gitignored).
- `lighthouse/REPORT.md` — **versionado**: tabela de medianas (4 categorias × 4 combinações
  página/perfil), LCP/CLS/TBT, versões (`lighthouse`, Chromium, Node), ambiente/condições e análise de
  qualquer resultado abaixo da meta.

## Verificação (critério de pronto)

1. `npm run build && npm run audit:lh` roda ponta a ponta e gera os 12 relatórios + `REPORT.md`.
2. `REPORT.md` traz a mediana de cada categoria por página/perfil, com LCP/CLS/TBT e versões/ambiente.
3. Resultados abaixo da meta têm justificativa e causa identificada (não há simplificação para inflar).
4. Runner e config versionados; relatórios crus ignorados (reprodutíveis via `audit:lh`).
