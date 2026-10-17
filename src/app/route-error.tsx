import type { ErrorComponentProps } from "@tanstack/react-router";
import { ErrorState } from "@/components/state";

/**
 * Boundary de erro padrão do router: erros não tratados durante load/render de uma rota. Reusa o
 * `ErrorState` (mensagem por tipo de falha + retry). `reset` re-tenta a rota.
 */
export function RouteError({ error, reset }: ErrorComponentProps) {
  return (
    <div className="py-16">
      <ErrorState error={error} onRetry={reset} retryable title="Algo deu errado" />
    </div>
  );
}
