/**
 * Catálogo de NFTs (ver mock.spec.md § fixtures). Determinístico e estável — base para
 * baselines de regressão visual (Fase 5). Variedade suficiente p/ exercitar busca, filtros
 * (coleção, faixa de preço, disponibilidade), ordenação e paginação (§6).
 *
 * Forma crua (strings/números); `db/seed.ts` valida cada item contra `nftSchema`, garantindo
 * que as fixtures estão sempre em dia com o contrato.
 */

export interface NftFixture {
  id: string;
  title: string;
  slug: string;
  description: string;
  imageUrl: string;
  collection: string;
  creator: string;
  priceEth: string;
  editionsTotal: number;
  editionsAvailable: number;
  attributes: { trait: string; value: string }[];
}

const COLLECTIONS = [
  { name: "Neon Apes", creator: "0xVoltaire" },
  { name: "Pixel Spirits", creator: "StudioKoi" },
  { name: "Astral Glyphs", creator: "Nebula Works" },
  { name: "Concrete Dreams", creator: "brutalist.eth" },
  { name: "Lumen Gardens", creator: "Flora Lab" },
] as const;

const RARITIES = ["Common", "Rare", "Epic", "Legendary"] as const;
const BACKGROUNDS = ["Void", "Sunset", "Aurora", "Mono", "Static"] as const;

/** Preços espalhados p/ cobrir filtros de faixa (0.05 → ~4.2 ETH). */
function priceFor(index: number): string {
  const base = 0.05 + index * 0.137;
  // mantém como string decimal; sem float no fio (o seed revalida via EthAmount).
  return base.toFixed(index % 3 === 0 ? 2 : 3);
}

function buildCatalog(): NftFixture[] {
  const items: NftFixture[] = [];
  const perCollection = 6; // 5 coleções × 6 = 30 itens (>1 página)
  let i = 0;
  for (const { name, creator } of COLLECTIONS) {
    for (let n = 0; n < perCollection; n++) {
      const editionsTotal = 5 + ((i * 3) % 20); // 5..24
      // ~1 em cada 6 esgotado (disponibilidade = sold_out); demais com estoque parcial/total.
      const soldOut = i % 6 === 5;
      const editionsAvailable = soldOut ? 0 : Math.max(1, editionsTotal - ((i * 2) % editionsTotal));
      const slug = `${name.toLowerCase().replace(/\s+/g, "-")}-${n + 1}`;
      items.push({
        id: `nft-${String(i + 1).padStart(3, "0")}`,
        title: `${name} #${n + 1}`,
        slug,
        description: `Peça ${n + 1} da coleção ${name}, cunhada por ${creator}. Arte generativa de demonstração.`,
        imageUrl: `https://picsum.photos/seed/${slug}/640/640`,
        collection: name,
        creator,
        priceEth: priceFor(i),
        editionsTotal,
        editionsAvailable,
        attributes: [
          { trait: "Rarity", value: RARITIES[i % RARITIES.length] },
          { trait: "Background", value: BACKGROUNDS[(i + 2) % BACKGROUNDS.length] },
          { trait: "Edition", value: `${n + 1}/${perCollection}` },
        ],
      });
      i++;
    }
  }
  return items;
}

export const NFT_FIXTURES: NftFixture[] = buildCatalog();

/** Nomes de coleção disponíveis (útil p/ UI de filtros na Fase 4). */
export const COLLECTION_NAMES: string[] = COLLECTIONS.map((c) => c.name);
