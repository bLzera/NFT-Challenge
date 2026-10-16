# Contexto da Sessão — NFT Marketplace (handoff)

> Documento de retomada. Objetivo: recuperar o estado e as decisões desta sessão na próxima.
> Pode ser removido antes da entrega final. Última atualização: 2026-10-16.

## Visão geral do projeto

Desafio **Frontend — Marketplace de NFTs** (ver `README.md` na raiz). Entrega é um **frontend
React/TypeScript** que simula um marketplace completo (descoberta, compra, conta) **sem backend
real** — toda a camada de dados (REST + tempo real) é simulada com **MSW** no mesmo bundle e
publicada estaticamente (Vercel). Não há API externa; pagamento é simulado (não real).

Stack obrigatória (README §2): React, TS, TanStack Router, TanStack Query, Axios, REST, Socket.IO,
Tailwind, shadcn/ui, MSW, Playwright, Lighthouse.

## Metodologia

- **SDD com specs co-localizadas por módulo/feature** (`*.spec.md` ao lado do código). Ciclo por
  módulo: escrever spec → aprovar → implementar → testar → próximo.
- **Ordem de build**: contratos → mock (MSW) + camada de dados → **UI por último**.
- **Plano completo aprovado** em: `/home/biel/.claude/plans/podemos-come-ar-a-montar-humming-origami.md`
  (ler esse arquivo primeiro ao retomar — tem fases detalhadas, estrutura de pastas e verificação).

## Princípios de arquitetura (transversais — valem pra tudo)

- **Fonte única da verdade**: um `store` em memória compartilhado por handlers REST **e** servidor-socket.
- **Contratos tipados compartilhados**: schemas Zod → tipos inferidos, usados por mock, cliente e UI.
- **Valores ETH como strings decimais** (`decimal.js`), nunca float; quantidades inteiras.
- **`version` por recurso** em cada mutação; eventos carregam versão → cliente aplica idempotente e
  descarta eventos antigos/duplicados.
- **Idempotência de pedido**: mapa `idempotencyKey → { requestHash, order }`; mesma chave → mesmo
  pedido; mesma chave + conteúdo diferente → 409.
- **Falhas são roteiro, não acidente**: cenários determinísticos e configuráveis. Nunca respostas
  fictícias em componentes/hooks/axios (critério eliminatório §11).
- **MSW em modo browser também em produção** (viabiliza deploy estático).
- **Controle de cenários**: `window.__mock` (`scenario/seed/reset/current`) + query params
  `?scenario=&seed=`. Dirigível pelo Playwright via `page.evaluate`.

## Estado atual: FASE 0 CONCLUÍDA ✅

Scaffold validado (build + typecheck + boot do dev server OK). O que existe:

### Ambiente / gotchas importantes
- **Node 18.19.1 + npm 9.2.0** (sem pnpm/yarn). Git disponível, **mas o diretório NÃO é repo git**
  ainda (fazer `git init` quando o usuário pedir).
- **msw fixado em `@2`** (2.15.x): `msw@3` exige Vite ≥6 e TS ≥5.9, incompatíveis com Node 18/Vite 5.
  O `@mswjs/socket.io-binding` (Fase 2) também é base v2.
- **CLI do MSW quebra no Node 18** (usa `styleText` do `node:util`, só no Node 20+). O
  `public/mockServiceWorker.js` foi **copiado manualmente** de `node_modules/msw/lib/`. Se atualizar o
  msw, recopiar o worker à mão.
- Tailwind fixado em **v3** (estabilidade no Node 18; shadcn ok com v3).

### Estrutura criada (`src/`)
```
src/
  config/env.ts              flag VITE_ENABLE_MOCKS (default: mocks ativos, inclusive em prod)
  mock/
    scenario.ts              estado {scenario,seed} + window.__mock + parse de query params
                             (efeitos reais plugados na Fase 2 via configureMockControls({resetStore}))
    browser.ts               setupWorker() do MSW (sem handlers ainda)
    enable.ts                enableMocks(): configura controles + worker.start() antes do render
  lib/
    utils.ts                 cn() (clsx + tailwind-merge)
    query/query-client.ts    QueryClient base (staleTime 30s, retry 1) — refinado na Fase 3
  app/
    router.tsx               router code-based (root + index placeholder); tipos registrados
    shell.tsx                casca com header + <Outlet/>
    providers.tsx            QueryClientProvider + RouterProvider
    app.spec.md              spec co-localizada da Fase 0
  main.tsx                   bootstrap assíncrono (enableMocks → render)
public/mockServiceWorker.js  worker do MSW
```
Config: `vite.config.ts` (alias `@/`→src), `tsconfig.app.json` (paths `@/*`), `tailwind.config.ts`,
`postcss.config.js`, `components.json` (shadcn), `src/index.css` (vars shadcn + prefers-reduced-motion).

### Dependências já instaladas
Runtime: `@tanstack/react-router`, `@tanstack/react-query`, `axios`, `zod`(v4), `decimal.js`,
`socket.io-client`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss-animate`,
`lucide-react`. Dev: `tailwindcss@3`, `postcss`, `autoprefixer`, devtools de router/query, `msw@2`.

## Subagentes definidos (`.claude/agents/`)

Fluxo escolhido para as fases lógicas 1–3: **eu (thread principal) implemento; subagentes revisam e
testam; eu orquestro por fase**. Nível projeto.
- **`nft-reviewer.md`** (modelo herdado/Opus): revisa diff vs README + spec; foca contrato, princípios
  acordados e critérios eliminatórios (Blocker). Somente leitura; achados rankeados.
- **`nft-tester.md`** (Sonnet): typecheck → lint → Vitest → build; relata pass/fail; não corrige.

Caveat: agentes recém-criados podem só ficar invocáveis como `subagent_type` após reload da sessão.
Fallback: usar `general-purpose` com as mesmas instruções.

## Próximos passos (retomar aqui)

**Fase 1 — Contratos tipados (ainda não iniciada).** Tarefas (lista de tasks #2–#8 existia na sessão):
1. Adicionar e configurar **Vitest** no começo da Fase 1 (pra o nft-tester ter testes unitários).
2. Criar `src/contracts/contracts.spec.md` + schemas Zod de todos os recursos REST (README §5:
   sessão/conta, NFTs, favoritos, carrinho, cotação, pedidos, perfil, carteiras) e eventos socket
   (§7: `nft.updated`, `order.updated` com `version`). Representar erros (validação, sessão, permissão,
   inexistente, conflito, falha transitória).
3. Value types: ETH (string decimal), quantidade (inteiro).
4. Orquestrar: implementar → nft-reviewer → nft-tester → consolidar.

Fases seguintes no plano: Fase 2 (mock/MSW + socket + cenários), Fase 3 (Axios/Query/realtime),
Fase 4 (UI — **depende de prints/Figma do usuário**, só quando ele fornecer), Fase 5 (Playwright),
Fase 6 (Lighthouse), Fase 7 (deploy Vercel + README/ARCHITECTURE).

## Como retomar rápido
1. Ler este arquivo e o plano em `~/.claude/plans/podemos-come-ar-a-montar-humming-origami.md`.
2. `npm install` (se necessário) e `npm run build` pra confirmar que a base ainda fecha.
3. Pedir/implementar a Fase 1 seguindo o fluxo dev → nft-reviewer → nft-tester.
