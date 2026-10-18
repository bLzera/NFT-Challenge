/**
 * Seção de destaques — Hero (`Desktop_In_cio.md` Frame 137, `Mobile_In_cio.md` Hero Banner).
 * Layout do Figma: coluna de texto à esquerda (label + título + descrição + CTA + 3 indicadores) e
 * imagem 450×450 com radius 24 à direita. CTA "EXPLORAR" rola/foca a grade via âncora interna
 * (`#catalog-grid`) — sem fabricar navegação.
 *
 * A arte do hero no Figma é um `fill: IMAGE` específico (asset não versionado aqui); como as artes
 * de NFT já vêm de `picsum.photos` em toda a app, o hero usa uma imagem representativa determinística
 * (seed fixa) — mesma estética, sem depender de baixar o asset exato do Figma.
 */
const HERO_IMAGE = "https://picsum.photos/seed/kurio-hero/600/600";

export function Hero() {
  return (
    <section className="flex flex-col items-start gap-8 overflow-hidden rounded-3xl bg-gradient-to-br from-surface-card to-surface-raised px-6 py-10 md:flex-row md:items-center md:justify-between md:gap-16 md:px-10 md:py-16">
      <div className="flex max-w-xl flex-col gap-8">
        <div className="flex flex-col gap-2">
          <p className="text-label font-medium text-foreground">Bem-vindo à Kurio</p>
          <h1 className="text-display-sm font-bold uppercase text-foreground md:text-display">
            Seja dono do futuro da arte digital
          </h1>
          <p className="text-label text-secondary-text">
            Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital
            com procedência verificada.
          </p>
        </div>
        <div className="flex flex-col items-start gap-6">
          <a
            href="#catalog-grid"
            className="inline-flex w-fit items-center justify-center rounded-md bg-primary px-7 py-2.5 text-body font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            EXPLORAR
          </a>
          {/* Indicadores decorativos (Figma: Ellipse 2/3/4, 8×8 Primary). */}
          <div aria-hidden="true" className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary" />
            <span className="size-2 rounded-full bg-primary/40" />
            <span className="size-2 rounded-full bg-primary/40" />
          </div>
        </div>
      </div>
      <img
        src={HERO_IMAGE}
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        className="aspect-square w-full shrink-0 rounded-3xl object-cover md:size-[450px] md:max-w-[45%]"
      />
    </section>
  );
}
