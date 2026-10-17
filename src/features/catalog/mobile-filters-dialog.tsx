import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import type { ListNftsQuery } from "@/contracts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FiltersPanel } from "./filters-panel";

/**
 * Painel de filtros no mobile (A10/§8): como não há `Sheet`/`Drawer` na base shadcn, usa o `Dialog`
 * da foundation (mesma dependência que `auth` já usa) — foco preso, Esc fecha, `aria-modal`,
 * `DialogTitle`/`DialogDescription` preenchidos. O gatilho tem `aria-expanded` (controlado pelo
 * próprio Radix via `data-state`, refletido no `open`).
 */
export function MobileFiltersDialog({
  search,
  onFiltersChange,
}: {
  search: ListNftsQuery;
  onFiltersChange: (patch: Partial<Omit<ListNftsQuery, "page" | "pageSize">>) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 md:hidden" aria-expanded={open}>
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Filtros
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Filtros</DialogTitle>
          <DialogDescription>
            Refine o catálogo por coleção, faixa de preço e disponibilidade.
          </DialogDescription>
        </DialogHeader>
        <FiltersPanel
          search={search}
          onFiltersChange={(patch) => {
            onFiltersChange(patch);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
