/**
 * Seção de destaques — Hero (`Desktop_In_cio.md` Hero/Frame 137, `Mobile_In_cio.md` Hero Banner).
 * CTA "EXPLORAR" rola/foca a grade via âncora interna (`#catalog-grid`) — sem fabricar navegação.
 */
export function Hero() {
  return (
    <section className="flex flex-col items-start gap-8 overflow-hidden rounded-3xl bg-gradient-to-br from-surface-card to-surface-raised px-6 py-10 md:flex-row md:items-center md:justify-between md:px-10 md:py-16">
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
        <a
          href="#catalog-grid"
          className="inline-flex w-fit items-center justify-center rounded-md bg-primary px-7 py-2.5 text-body font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          EXPLORAR
        </a>
      </div>
      <div
        aria-hidden="true"
        className="h-48 w-full shrink-0 rounded-3xl bg-surface-raised md:h-72 md:w-72"
      />
    </section>
  );
}
