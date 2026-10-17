import { ChevronDown } from "lucide-react";
import { nftSortSchema, type NftSort } from "@/contracts";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SORT_LABELS: Record<NftSort, string> = {
  recent: "Listados recentemente",
  price_asc: "Preço: menor para maior",
  price_desc: "Preço: maior para menor",
  popular: "Mais populares",
};

const TABS: { sort: NftSort; label: string }[] = [
  { sort: "recent", label: "Todos os NFTs" },
  // "Novos lançamentos" (A6) foi OMITIDA: não há `sort` distinto no contrato para ela — o Figma
  // mostra a aba, mas `nftSortSchema` só tem `recent`/`price_asc`/`price_desc`/`popular`, o mesmo
  // valor de "Todos os NFTs". Mantê-la era um controle morto/duplicado (clicar não mudava nada e
  // ela nunca ficava ativa isoladamente) — risco de aparentar funcionalidade sem ter (§11). Desvio
  // consciente do Figma, documentado em ARCHITECTURE.md (Fase 7).
  { sort: "popular", label: "Em alta" },
];

/**
 * Toolbar (A6): abas "Todos os NFTs"/"Em alta" mapeiam para `sort` — mesma fonte única que o
 * dropdown "Ordenar por". A aba ativa reflete o `sort` atual via `aria-current` (não só cor, §8).
 */
export function Toolbar({ sort, onSortChange }: { sort: NftSort; onSortChange: (sort: NftSort) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-primary/30 pb-4">
      <nav aria-label="Filtrar por categoria" className="flex flex-wrap gap-5">
        {TABS.map((tab) => {
          const active = tab.sort === sort;
          return (
            <button
              key={tab.label}
              type="button"
              aria-current={active ? "true" : undefined}
              onClick={() => onSortChange(tab.sort)}
              className={cn(
                "text-body-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "text-accent-text" : "text-foreground hover:text-accent-text",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 text-body-sm text-foreground hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="text-muted-foreground">Ordenar por:</span>
            {SORT_LABELS[sort]}
            <ChevronDown className="size-4" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {nftSortSchema.options.map((option) => (
            <DropdownMenuItem
              key={option}
              aria-current={option === sort ? "true" : undefined}
              onSelect={() => onSortChange(option)}
            >
              {SORT_LABELS[option]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
