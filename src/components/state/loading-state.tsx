import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  /** Rótulo acessível anunciado via `aria-live` enquanto carrega. */
  label?: string;
  /**
   * Conteúdo visual do loading — tipicamente skeletons dimensionados como o conteúdo real (§8).
   * Sem `children`, nada visual é renderizado (só o anúncio acessível), útil para refetch silencioso.
   */
  children?: ReactNode;
  className?: string;
}

/**
 * Envoltório de carregamento (§4/§8). Anuncia o estado a leitores de tela (`role="status"`,
 * `aria-live="polite"`) e hospeda os skeletons. Os skeletons em si vivem nas features (dimensões
 * específicas); aqui ficam a semântica acessível e o rótulo visualmente oculto.
 */
export function LoadingState({ label = "Carregando…", children, className }: LoadingStateProps) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={cn(className)}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/**
 * Indicador discreto de atualização em segundo plano (§4): o conteúdo cacheado continua visível e
 * uma faixa sutil sinaliza o refetch. Anunciado de forma não-intrusiva.
 */
export function BackgroundUpdateIndicator({
  active,
  label = "Atualizando…",
  className,
}: {
  active: boolean;
  label?: string;
  className?: string;
}) {
  if (!active) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-2 text-caption text-muted-foreground motion-safe:animate-pulse",
        className,
      )}
    >
      <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
      {label}
    </div>
  );
}
