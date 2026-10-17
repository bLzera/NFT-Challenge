/**
 * Decisão A4/A4b (catalog.spec.md): o mock não expõe facets/contagens por coleção, então a UI não
 * pode derivar um `(NN)` real. Em vez de importar de `@/mock` (proibido para componentes/hooks —
 * UI consome só `@/contracts` + `@/lib/*`), a lista de nomes é redeclarada aqui como dado de
 * apresentação estável do catálogo de demonstração.
 *
 * IMPORTANTE — risco de drift: esta constante ESPELHA manualmente as 5 coleções de
 * `src/mock/fixtures/nfts.ts` (`COLLECTIONS`/`COLLECTION_NAMES`). Não é um shape de contrato: se as
 * fixtures mudarem de nome/quantidade, esta lista precisa ser atualizada manualmente — não há
 * verificação automática de consistência entre as duas. Mantida curta e exata de propósito.
 */
export const COLLECTIONS: string[] = [
  "Neon Apes",
  "Pixel Spirits",
  "Astral Glyphs",
  "Concrete Dreams",
  "Lumen Gardens",
];
