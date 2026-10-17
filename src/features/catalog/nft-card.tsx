import { Link } from "@tanstack/react-router";
import type { Nft } from "@/contracts";
import { formatEth } from "@/contracts";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Card de NFT da grade (A8): link tipado para `/nft/$idOrSlug` usando o `slug` real. Esgotado
 * (`editionsAvailable === 0`) ganha selo textual (não só cor, §8). Preço via `formatEth` — nunca
 * aritmética/parseFloat na UI (ETH é string decimal).
 */
export function NftCard({ nft }: { nft: Nft }) {
  const soldOut = nft.editionsAvailable === 0;

  return (
    <Link
      to="/nft/$idOrSlug"
      params={{ idOrSlug: nft.slug }}
      data-testid="nft-card"
      aria-label={`${nft.title}, ${formatEth(nft.priceEth)} ETH${soldOut ? ", esgotado" : ""}`}
      className="group flex flex-col gap-3 rounded-lg bg-surface-card p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative overflow-hidden rounded-[15px]">
        <img
          src={nft.imageUrl}
          alt={nft.title}
          loading="lazy"
          className={cn(
            "aspect-square w-full rounded-[15px] object-cover transition-opacity",
            soldOut && "opacity-50",
          )}
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
  );
}

/** Skeleton do card com as mesmas dimensões/estrutura do real — sem layout shift (§8). */
export function NftCardSkeleton() {
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
