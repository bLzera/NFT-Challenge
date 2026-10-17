import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { errorMessage, isRetryable, resolveApiRequestError } from "./error-message";

interface ErrorStateProps {
  /** Erro vindo do React Query (HttpError) ou um ApiRequestError já normalizado. */
  error: unknown;
  /** Dispara nova tentativa (ex.: `query.refetch`). Quando ausente, o botão não aparece. */
  onRetry?: () => void;
  /** Força mostrar o botão de retry mesmo em erros não marcados como retryable. */
  retryable?: boolean;
  title?: string;
  className?: string;
}

/**
 * Bloco de erro padrão (§4). Anunciado por leitores de tela (`role="alert"`), ramifica a mensagem
 * por `code` de contrato (ver error-message.ts) e oferece retry em falhas de rede/transitórias — ou
 * sempre que `onRetry` + `retryable` forem passados. Não fabrica dado: só descreve a falha.
 */
export function ErrorState({
  error,
  onRetry,
  retryable,
  title = "Não foi possível carregar",
  className,
}: ErrorStateProps) {
  const detail = resolveApiRequestError(error);
  const showRetry = Boolean(onRetry) && (retryable ?? isRetryable(detail));

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface-card px-6 py-10 text-center",
        className,
      )}
    >
      <AlertCircle className="size-8 text-destructive" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-body-lg font-bold text-foreground">{title}</p>
        <p className="text-body-sm text-muted-foreground">{errorMessage(detail)}</p>
      </div>
      {showRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw aria-hidden="true" />
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
