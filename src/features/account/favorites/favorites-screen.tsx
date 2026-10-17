import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { AccountLayout } from "../account-layout";
import { EmptyState, ErrorState, LoadingState, isRetryable, resolveApiRequestError } from "@/components/state";
import { Button } from "@/components/ui/button";
import { useFavoritesList } from "./use-favorites-list";
import { FavoriteCard, FavoriteCardError, FavoriteCardSkeleton } from "./favorite-card";

/**
 * Tela `/favorites` (A1): grade dos NFTs favoritados, resolvidos via `getNft` (A-fav-1). Sem frame
 * no Figma — deriva do padrão de grade do catálogo. Remover usa `useToggleFavorite` (otimista +
 * rollback, A-fav-2); empty state (A-fav-3); NFT individual que falha não derruba a grade inteira.
 */
export function FavoritesScreen() {
  return (
    <AccountLayout active="favorites">
      <FavoritesContent />
    </AccountLayout>
  );
}

function FavoritesContent() {
  const { favoritesQuery, nftIds, resolutions } = useFavoritesList();

  if (favoritesQuery.isPending) {
    return <FavoritesSkeleton />;
  }

  if (favoritesQuery.isError) {
    return (
      <ErrorState
        error={favoritesQuery.error}
        title="Não foi possível carregar seus favoritos"
        onRetry={() => favoritesQuery.refetch()}
        retryable={isRetryable(resolveApiRequestError(favoritesQuery.error))}
      />
    );
  }

  if (nftIds.length === 0) {
    return (
      <EmptyState
        icon={<Heart />}
        title="Você ainda não favoritou nenhum NFT."
        description="Explore o catálogo e favorite os NFTs que mais gostar."
        action={
          <Button asChild>
            <Link to="/">Explorar o catálogo</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-body-lg font-bold text-foreground">Favoritos</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {resolutions.map(({ nftId, query }) => {
          if (query.isPending) return <FavoriteCardSkeleton key={nftId} />;
          if (query.isError || !query.data) return <FavoriteCardError key={nftId} nftId={nftId} />;
          return <FavoriteCard key={nftId} nft={query.data} />;
        })}
      </div>
    </div>
  );
}

function FavoritesSkeleton() {
  return (
    <LoadingState label="Carregando favoritos…">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <FavoriteCardSkeleton key={i} />
        ))}
      </div>
    </LoadingState>
  );
}
