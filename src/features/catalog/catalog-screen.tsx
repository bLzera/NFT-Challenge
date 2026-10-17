import type { NftSort } from "@/contracts";
import {
  LoadingState,
  BackgroundUpdateIndicator,
  EmptyState,
  ErrorState,
  errorMessage,
  resolveApiRequestError,
} from "@/components/state";
import { Button } from "@/components/ui/button";
import { useCatalogSearch } from "./use-catalog-search";
import { useNftList } from "./use-nft-list";
import { Hero } from "./hero";
import { FeaturedBanner } from "./featured-banner";
import { FiltersPanel } from "./filters-panel";
import { MobileFiltersDialog } from "./mobile-filters-dialog";
import { Toolbar } from "./toolbar";
import { SearchBox } from "./search-box";
import { NftCard, NftCardSkeleton } from "./nft-card";
import { Pagination } from "./pagination";

const SKELETON_COUNT = 6;

/**
 * Tela do catálogo (`/`, A1): destaques + sidebar de filtros + toolbar/busca + grade + paginação.
 * Todo o estado de consulta vem do `search` da rota (A2) — nenhum `useState` de filtro aqui.
 */
export function CatalogScreen() {
  const { search, setFilters, setPage } = useCatalogSearch();
  const query = useNftList(search);
  const { data, isPending, isError, error, isFetching, refetch } = query;

  const featuredNft = data?.items[0];
  const isEmpty = data !== undefined && data.items.length === 0;
  // Stale-while-error: se já há dados em cache (ex.: refetch após sucesso falhou), preserva a grade
  // velha em vez de empilhar o `ErrorState` cheio sobre ela — só bloqueia a tela quando NÃO há
  // nenhum dado pra mostrar. Com dado em cache, o erro vira um aviso não-bloqueante com retry.
  const hasStaleData = data !== undefined;
  const showFullScreenError = isError && !hasStaleData;
  const showStaleErrorNotice = isError && hasStaleData;

  function clearFilters() {
    setFilters({
      q: undefined,
      collection: undefined,
      minPriceEth: undefined,
      maxPriceEth: undefined,
      availability: undefined,
      sort: "recent",
    });
  }

  return (
    <div className="flex flex-col gap-24 py-6">
      <Hero />

      <div className="flex flex-col gap-12 lg:flex-row lg:gap-12">
        <aside className="flex flex-col gap-6 lg:w-[310px] lg:shrink-0">
          <div className="hidden rounded-lg bg-surface-card p-5 lg:block">
            <FiltersPanel search={search} onFiltersChange={setFilters} />
          </div>
          <FeaturedBanner nft={featuredNft} isLoading={isPending} />
        </aside>

        <section id="catalog-grid" className="flex flex-1 flex-col gap-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <SearchBox value={search.q} onCommit={(q) => setFilters({ q })} />
              <MobileFiltersDialog search={search} onFiltersChange={setFilters} />
            </div>
            <Toolbar sort={search.sort} onSortChange={(sort: NftSort) => setFilters({ sort })} />
            <BackgroundUpdateIndicator active={isFetching && !isPending && !isError} />
          </div>

          {isPending && (
            <LoadingState label="Carregando NFTs…">
              <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
                {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                  <NftCardSkeleton key={i} />
                ))}
              </div>
            </LoadingState>
          )}

          {showFullScreenError && <ErrorState error={error} onRetry={() => void refetch()} />}

          {showStaleErrorNotice && (
            <div
              role="alert"
              className="flex flex-col items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-body-sm text-foreground">
                Falha ao atualizar: {errorMessage(resolveApiRequestError(error))}
              </p>
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                Tentar novamente
              </Button>
            </div>
          )}

          {isEmpty && (
            <EmptyState
              title="Nenhum NFT encontrado"
              description="Tente ajustar a busca ou os filtros aplicados."
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              }
            />
          )}

          {data && data.items.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
                {data.items.map((nft) => (
                  <NftCard key={nft.id} nft={nft} />
                ))}
              </div>
              <Pagination
                page={data.page}
                hasNext={data.hasNext}
                total={data.total}
                pageSize={data.pageSize}
                onPageChange={setPage}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
