import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Paginação (§8): `nav[aria-label="Paginação"]`, botão da página atual com `aria-current="page"`,
 * anterior/próximo com `aria-label`, estados desabilitados reais (`disabled`). Clicar grava `page`
 * no `search` (via `onPageChange`, que preserva os demais parâmetros — regra §3).
 *
 * `total`/`pageSize` vêm do `NftPage` real (`common.ts` § envelope paginado) — usados só para
 * computar `totalPages` e **não** oferecer números de página inexistentes (clicar em uma página
 * que não existe cairia no `EmptyState`, confundindo "sem resultado" com "página fora do range").
 * Nenhum dado fabricado: é aritmética sobre contagem real do servidor.
 */
export function Pagination({
  page,
  hasNext,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  hasNext: boolean;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageNumbers = [page - 1, page, page + 1, page + 2].filter((p) => p >= 1 && p <= totalPages);

  return (
    <nav aria-label="Paginação" className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Página anterior"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="flex size-9 items-center justify-center rounded-md border border-border text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>

      {pageNumbers.map((p) => (
        <button
          key={p}
          type="button"
          aria-current={p === page ? "page" : undefined}
          onClick={() => onPageChange(p)}
          className={cn(
            "flex size-9 items-center justify-center rounded-md text-body-lg font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            p === page
              ? "bg-primary text-primary-foreground"
              : "border border-border text-foreground hover:bg-accent",
          )}
        >
          {p}
        </button>
      ))}

      <button
        type="button"
        aria-label="Próxima página"
        disabled={!hasNext}
        onClick={() => onPageChange(page + 1)}
        className="flex size-9 items-center justify-center rounded-md border border-border text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
