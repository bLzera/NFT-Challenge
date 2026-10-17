import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import type { Nft } from "@/contracts";
import { formatEth } from "@/contracts";
import { useToggleFavorite } from "@/lib/favorites/use-toggle-favorite";
import { errorMessage, resolveApiRequestError } from "@/components/state";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Card de favorito (sem frame no Figma — deriva de `NftCard`, A-fav): link ao detalhe + botão
 * "Remover dos favoritos" sobreposto, reusando `useToggleFavorite` (otimista + rollback, A-fav-2).
 */
export function FavoriteCard({ nft }: { nft: Nft }) {
  const toggleFavorite = useToggleFavorite();
  const soldOut = nft.editionsAvailable === 0;
  const isFavorited = true; // card só existe enquanto o nftId está na lista de favoritos (A-fav-2).

  function handleRemove() {
    toggleFavorite.mutate(nft.id, {
      onError: (error) => {
        toast.error(errorMessage(resolveApiRequestError(error)));
      },
    });
  }

  return (
    <div
      data-testid="nft-card"
      className="group relative flex flex-col gap-3 rounded-lg bg-surface-card p-3"
    >
      <button
        type="button"
        onClick={handleRemove}
        disabled={toggleFavorite.isPending}
        aria-label={`Remover ${nft.title} dos favoritos`}
        aria-pressed={isFavorited}
        className="absolute right-5 top-5 z-10 flex size-8 items-center justify-center rounded-full bg-ink/80 text-destructive transition-colors hover:text-destructive/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <Heart className="size-4 fill-current" aria-hidden="true" />
      </button>

      <Link
        to="/nft/$idOrSlug"
        params={{ idOrSlug: nft.slug }}
        aria-label={`${nft.title}, ${formatEth(nft.priceEth)} ETH${soldOut ? ", esgotado" : ""}`}
        className="flex flex-col gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="relative overflow-hidden rounded-[15px]">
          <img
            src={nft.imageUrl}
            alt={nft.title}
            loading="lazy"
            className="aspect-square w-full rounded-[15px] object-cover"
          />
          {soldOut && (
            <span className="absolute left-2 top-2 rounded-md bg-ink/90 px-2 py-1 text-caption-sm font-bold text-foreground">
              Esgotado
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <p className="truncate text-body font-normal text-foreground">{nft.title}</p>
          <p className="text-body-lg font-bold text-accent-text">{formatEth(nft.priceEth)} ETH</p>
        </div>
      </Link>
    </div>
  );
}

/** Skeleton do card — mesmas dimensões, sem layout shift (§8). */
export function FavoriteCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-surface-card p-3">
      <Skeleton className="aspect-square w-full rounded-[15px]" />
      <div className="flex flex-col gap-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-5 w-1/3" />
      </div>
    </div>
  );
}

/** Card em erro isolado (NFT individual falha ao resolver, A-fav do critério 6) — não derruba a grade. */
export function FavoriteCardError({ nftId }: { nftId: string }) {
  return (
    <div
      role="alert"
      data-testid="nft-card"
      className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-surface-card p-3 text-center"
    >
      <p className="text-body-sm text-muted-foreground">Não foi possível carregar este item.</p>
      <p className="text-caption text-secondary-text">ID: {nftId}</p>
    </div>
  );
}
