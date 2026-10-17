import { cn } from "@/lib/utils";

/**
 * Skeleton com shimmer (§8). Importante: o chamador define as dimensões **iguais ao conteúdo real**
 * para não haver layout shift ao trocar skeleton↔conteúdo. O shimmer usa a keyframe `shimmer` do
 * tailwind.config; em `prefers-reduced-motion` o media query em `index.css` suprime a animação,
 * deixando um fundo estático (a faixa `motion-reduce:hidden` também a remove da árvore).
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-md bg-surface-raised", className)}
      aria-hidden="true"
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-foreground/10 to-transparent motion-reduce:hidden" />
    </div>
  );
}

export { Skeleton };
