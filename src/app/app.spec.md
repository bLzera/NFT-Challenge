# Spec — App / Fundações (Fase 0)

## Objetivo

Estabelecer a casca executável do projeto: stack obrigatória instalada, roteamento,
cache remoto, ativação da camada de mock e superfície de controle de cenários — tudo
rodando a partir de um checkout limpo, sem backend.

## Stack instalada

- **Build/SPA**: Vite 5 + React 18 + TypeScript (Node 18).
- **Roteamento**: `@tanstack/react-router` (code-based, `src/app/router.tsx`).
- **Estado remoto**: `@tanstack/react-query` (`src/lib/query/query-client.ts`).
- **HTTP**: `axios` (instância criada na Fase 3).
- **Tempo real**: `socket.io-client` (cliente criado na Fase 3).
- **Estilo**: Tailwind CSS 3 + `tailwindcss-animate`; base shadcn/ui via `components.json`.
- **Mock**: `msw@2` (worker em `public/mockServiceWorker.js`).
- **Contratos/precisão**: `zod` (Fase 1), `decimal.js` (valores ETH).

> Nota de versão: `msw@3` exige Vite ≥6 e TS ≥5.9, incompatíveis com Node 18/Vite 5;
> por isso o projeto fixa `msw@2`, que também é a base do `@mswjs/socket.io-binding`.

## Decisões estruturais

- **Alias `@/` → `src/`** (`vite.config.ts` + `tsconfig.app.json`).
- **Mocks ativos por padrão**, inclusive em produção, controlados por `VITE_ENABLE_MOCKS`
  (`src/config/env.ts`). É o que permite o deploy estático na Vercel.
- **Bootstrap assíncrono** (`src/main.tsx`): sobe o MSW *antes* do primeiro render, para
  nenhuma requisição escapar antes da interceptação estar pronta.
- **Controle de cenários** (`src/mock/scenario.ts`): estado global `{ scenario, seed }`
  dirigível por `?scenario=&seed=` e por `window.__mock` (`scenario()`, `seed()`,
  `reset()`, `current()`). Efeitos de cada cenário são plugados na Fase 2 via
  `configureMockControls({ resetStore })`.

## Comportamento esperado nesta fase

- `npm run dev` sobe o app; a home exibe um placeholder de fundações.
- Service Worker do MSW registrado (sem handlers ainda → requisições passam direto).
- `window.__mock.current()` disponível no console do browser.
- `npm run build` e typecheck passam sem erros.

## Fora de escopo (fases seguintes)

- Handlers REST, store, servidor-socket e cenários determinísticos → Fase 2.
- Instância Axios, hooks de dados, wrapper de socket, reconciliação → Fase 3.
- Telas, layout do Figma, responsividade e a11y → Fase 4.
