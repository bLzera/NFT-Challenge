# Relatório Lighthouse — Fase 6

> Gerado por `lighthouse/run.mjs` (`npm run build && npm run audit:lh`). Mediana de 3 execuções
> por página/perfil, sobre o build otimizado (`vite preview`) com mocks no cenário `default`.
> Relatórios crus (HTML/JSON por execução) em `lighthouse/reports/` (gitignored; reprodutíveis).

## Metas (README §10)

Performance ≥ 90 · Accessibility ≥ 95 · Best Practices ≥ 95 · SEO ≥ 90.

## Scores (mediana de 3 execuções)

| Página | Perfil | Performance | Accessibility | Best Practices | SEO |
|---|---|---:|---:|---:|---:|
| Início (/) | mobile | 88 ⚠️ | 100 ✅ | 100 ✅ | 92 ✅ |
| Início (/) | desktop | 98 ✅ | 100 ✅ | 100 ✅ | 92 ✅ |
| Detalhe (/nft/neon-apes-1) | mobile | 85 ⚠️ | 100 ✅ | 100 ✅ | 92 ✅ |
| Detalhe (/nft/neon-apes-1) | desktop | 99 ✅ | 100 ✅ | 100 ✅ | 92 ✅ |

## Métricas (execução representativa da mediana de performance)

| Página | Perfil | LCP | CLS | TBT |
|---|---|---:|---:|---:|
| Início (/) | mobile | 3167 ms | 0.000 | 123 ms |
| Início (/) | desktop | 1008 ms | 0.000 | 15 ms |
| Detalhe (/nft/neon-apes-1) | mobile | 3538 ms | 0.000 | 123 ms |
| Detalhe (/nft/neon-apes-1) | desktop | 749 ms | 0.018 | 0 ms |

## Análise de resultados

- **Início (/) · mobile · performance**: 88 (meta 90).
- **Detalhe (/nft/neon-apes-1) · mobile · performance**: 85 (meta 90).

**Desktop atinge todas as metas em ambas as páginas (Perf ≥ 98).** O déficit é só de **Performance no perfil mobile**
(throttling simulado ~Slow 4G + CPU 4×). Accessibility (100), Best Practices (100) e SEO (92) passam
em todas as combinações; CLS ≈ 0 e TBT baixo — o limitante é o **tempo até o conteúdo pintar**, não
interatividade ou layout shift.

**Causas identificadas (README §10):**

1. **Render client-side (SPA) + bundle único.** O app pinta só após o JS bootar, o MSW interceptar e
   os dados chegarem → FCP ~2,8–3,2 s no mobile throttled, e o LCP fica ancorado nele. Na **home** o
   elemento LCP é o `<h1>` do banner (texto), 100% atrás do FCP; não há imagem a culpar ali. O bundle
   (~830 kB) inclui, **por design do desafio**, o worker do **MSW + store/handlers/socket mockados**
   servidos no bundle de produção (sem backend real, deploy estático) — peso intrínseco a esta entrega,
   não um descuido.
2. **Detalhe — imagem LCP externa.** No `/nft/<slug>` o elemento LCP é a arte servida de
   `picsum.photos`, que **redireciona para o CDN `fastly.picsum.photos`** (o salto de rede real do
   LCP). Já aplicados os ganhos legítimos: `fetchpriority="high"` na imagem + `preconnect` às **duas**
   origens (`picsum.photos` e `fastly.picsum.photos`) + `dns-prefetch` (resolve o diagnóstico
   `prioritize-lcp-image`); ainda assim é limitado pela rede externa.

> A auditoria **não** mascara/omite imagens, fontes ou funcionalidades para inflar a nota (§10): roda o
> build real com mocks ativos e artes externas. Fontes são self-hosted (`@fontsource/roboto-mono`).

**Alavancas para subir o mobile (não aplicadas aqui para não regredir o estado já commitado/testado;
não afetam o desktop, já em 99):** code-splitting por rota + `manualChunks` para reduzir o JS inicial
(maior oportunidade: `unused-javascript`); servir as artes em formato moderno/origem mais rápida. O
README §10 admite resultado abaixo da meta desde que justificado — é o caso.

## Ferramentas, ambiente e condições

- **Lighthouse**: 12.8.2
- **Chromium**: 140.0.0.0 (binário: `~/.cache/ms-playwright/chromium-1193/chrome-linux/chrome`)
- **Node**: v18.19.1
- **Alvos**: `/` e `/nft/neon-apes-1`, ambos com `?scenario=default&seed=1`.
- **Perfis**: mobile (throttling simulado ~Slow 4G, CPU 4×) e desktop (screenEmulation 1350×940 @1×).
- **Servidor**: `vite preview` na porta 4173 servindo `dist/` (build otimizado), mocks MSW ligados.
- **Execuções**: 3 por combinação; mediana por categoria.
