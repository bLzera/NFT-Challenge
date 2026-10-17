import type { ListNftsQuery } from "@/contracts";
import { CollectionFilter } from "./collection-filter";
import { PriceFilter } from "./price-filter";
import { AvailabilityFilter } from "./availability-filter";
import { NetworkFilter } from "./network-filter";

/**
 * Conteúdo dos filtros (Sidebar desktop `Desktop_In_cio.md`), compartilhado entre a coluna fixa do
 * desktop e o painel mobile (Dialog). Três blocos com gap 40, igual ao Figma.
 */
export function FiltersPanel({
  search,
  onFiltersChange,
}: {
  search: ListNftsQuery;
  onFiltersChange: (patch: Partial<Omit<ListNftsQuery, "page" | "pageSize">>) => void;
}) {
  return (
    <div className="flex flex-col gap-10">
      <CollectionFilter
        value={search.collection}
        onChange={(collection) => onFiltersChange({ collection })}
      />
      <PriceFilter
        minPriceEth={search.minPriceEth}
        maxPriceEth={search.maxPriceEth}
        onApply={(range) => onFiltersChange(range)}
      />
      <AvailabilityFilter
        value={search.availability}
        onChange={(availability) => onFiltersChange({ availability })}
      />
      <NetworkFilter />
    </div>
  );
}
