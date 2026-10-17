import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  /** Ícone opcional (ex.: lucide) exibido acima do título. */
  icon?: ReactNode;
  /** Ação opcional (ex.: "Limpar filtros", "Explorar catálogo"). */
  action?: ReactNode;
  className?: string;
}

/**
 * Bloco de estado vazio (§4). Distinto do erro: a request foi bem-sucedida, mas não há dados
 * (ex.: busca sem resultados). Anunciado como `status` para leitores de tela.
 */
export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center",
        className,
      )}
    >
      {icon && <div className="text-muted-foreground [&_svg]:size-8">{icon}</div>}
      <div className="space-y-1">
        <p className="text-body-lg font-bold text-foreground">{title}</p>
        {description && <p className="text-body-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
