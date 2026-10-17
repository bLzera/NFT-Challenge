/**
 * Página-esqueleto. A `foundation` registra o esqueleto de rotas (para que os links tipados do
 * header/features compilem); cada feature da Fase 4 substitui o `component` da sua rota pela
 * implementação real. Não simula funcionalidade — deixa explícito que está em construção.
 */
export function PlaceholderPage({ title, description }: { title: string; description?: string }) {
  return (
    <section className="mx-auto max-w-xl space-y-3 py-16 text-center">
      <h1 className="text-heading-sm font-bold text-foreground">{title}</h1>
      <p className="text-body-sm text-muted-foreground">
        {description ?? "Em construção — chega nas próximas features da Fase 4."}
      </p>
    </section>
  );
}
