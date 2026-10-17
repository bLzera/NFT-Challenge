# Dependências adicionais

Documento vivo. Registra **toda** biblioteca em `package.json` que **não** faz parte da stack
obrigatória do desafio (README §2), com a justificativa de uso. A stack obrigatória é fixa; o
restante é escolha do candidato e precisa ser defensável na avaliação. No encerramento (Fase 7) este
conteúdo alimenta a seção de dependências do `ARCHITECTURE.md`.

> Atualizar **no mesmo passo** em que uma dependência entra/sai do `package.json`.

## Stack obrigatória (não listada aqui)

React, TypeScript, TanStack Router, TanStack Query, Axios, Socket.IO (`socket.io-client`), Tailwind
CSS, shadcn/ui, MSW, Playwright, Lighthouse. Ferramenta de build (Vite) e organização são livres por
enunciado.

## Runtime (`dependencies`)

| Pacote | Versão | Papel | Por que não dá para evitar |
| --- | --- | --- | --- |
| `zod` | ^4.6.7 | Schemas tipados dos contratos (`@/contracts`) → tipos inferidos, usados por mock, cliente HTTP e UI. | O desafio exige **contratos tipados entre transporte, estado e interface** (§4) e validação de respostas. Zod dá validação em runtime + inferência de tipo numa fonte única; a alternativa (tipos TS puros) não valida payloads do mock/rede. |
| `decimal.js` | ^10.6.0 | Aritmética decimal exata de valores ETH (`value-types`). | §Carrinho exige ETH como **string decimal com precisão**, proibindo float. `decimal.js` garante cálculos sem erro de ponto flutuante. |
| `class-variance-authority` | ^0.7.1 | Variantes de componente (ex.: `buttonVariants`). | Dependência de fato do **shadcn/ui** (parte da stack obrigatória); gerada pelos próprios componentes shadcn. |
| `clsx` | ^2.1.1 | Composição condicional de classes no util `cn`. | Dependência de fato do **shadcn/ui** (helper `cn` padrão). |
| `tailwind-merge` | ^3.7.0 | Resolve conflitos de classes Tailwind no util `cn`. | Dependência de fato do **shadcn/ui** (helper `cn` padrão). |
| `tailwindcss-animate` | ^1.0.7 | Keyframes/utilitários de animação (accordion, etc.). | Plugin padrão exigido pelos presets do **shadcn/ui**. |
| `lucide-react` | ^1.58.0 | Ícones de interface (busca, carrinho, usuário, menu, chevrons…). | Conjunto de ícones **padrão do shadcn/ui**. Evita adicionar `vite-plugin-svgr`: usamos lucide para ícones de UI e inlinamos só os SVGs de marca (`design/assets/svg/`) quando necessário. |
| `sonner` | ^2.0.8 | Toaster acessível para feedback de mutations e de eventos em tempo real. | **Componente de toast oficial do shadcn/ui** (substituiu o `toast` legado). §8 exige feedback acessível para mutations e mudanças em tempo real; o Sonner entrega `aria-live`/foco prontos. |
| `@fontsource/roboto-mono` | ^5.3.0 | Fonte Roboto Mono **self-hosted** (pesos 400/500/700). | O design usa Roboto Mono em 100% dos textos. Self-hosting evita dependência de CDN/Google Fonts em runtime — requisito de execução a partir de checkout limpo (§12) e de Lighthouse sem rede externa (§10); §8 pede fontes acessíveis à execução local. |
| `@radix-ui/react-{slot,label,dialog,dropdown-menu,tooltip,separator}` | 1.x–2.x | Primitivos headless (foco preso, Esc, `aria-modal`, teclado) sob os componentes `src/components/ui/*`. | São as **primitivas que o shadcn/ui usa** — cada componente shadcn gerado importa seu pacote Radix correspondente. Entregam a acessibilidade de diálogo/menu/tooltip exigida em §8 sem reimplementar foco/teclado à mão. |

## Desenvolvimento (`devDependencies`)

| Pacote | Versão | Papel | Por que não dá para evitar |
| --- | --- | --- | --- |
| `@mswjs/socket.io-binding` | ^0.2.0 | Ponte Socket.IO ↔ MSW para simular eventos de tempo real. | **Sugerido pelo próprio enunciado** (§6); viabiliza exercitar `socket.io-client` contra mocks sem backend real. |
| `vite` + `@vitejs/plugin-react` | ^5.4.10 / ^4.3.3 | Build/dev server. | Ferramenta de build é **livre por enunciado** (§2); Vite é o preset recomendado para deploy (§12). |
| `vitest` | ^2.1.9 | Testes unitários da camada de contratos/dados/mock. | Testes unitários não são a stack obrigatória (essa é Playwright/E2E), mas sustentam o SDD das fases 0–3. Integra nativamente com Vite. |
| `typescript` / `typescript-eslint` / `eslint` + plugins | — | Type-check e lint. | Qualidade/tipagem exigidas em §4/§11; ESLint/TS são padrão do ecossistema. |
| `autoprefixer` / `postcss` | — | Pipeline CSS do Tailwind. | Dependências de fato do **Tailwind** (stack obrigatória). |
| `@tanstack/react-query-devtools` / `@tanstack/router-devtools` | — | Devtools de Query/Router (apenas em dev). | Auxílio de desenvolvimento das libs obrigatórias; não vão para produção. |

## Decisões de não-adoção

- **`vite-plugin-svgr`** — avaliado para importar os SVGs de `design/assets/svg/` como componentes.
  Dispensado: `lucide-react` cobre os ícones de UI e os poucos SVGs de marca são inlinados sob
  demanda. Reavaliar se o volume de SVGs de marca crescer.
- **Resolver de formulário (`react-hook-form` + `@hookform/resolvers`)** — a decidir na feature
  `auth` (primeira com formulário real). Se adotado, entra aqui com a justificativa.
