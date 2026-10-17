import { Link } from "@tanstack/react-router";
import type { Nft } from "@/contracts";
import { formatEth } from "@/contracts";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Banner "NFT EM DESTAQUE" (sidebar `Featured NFT Banner`): mostra o primeiro item real da
 * consulta atual (título + preço do `NftPage`) linkando para o detalhe. Sem dado fabricado — lista
 * vazia/carregando vira skeleton/placeholder, nunca um NFT inventado (A-destaques).
 */
export function FeaturedBanner({
  nft,
  isLoading,
}: {
  nft: Nft | undefined;
  isLoading: boolean;
}) {
  return (
    <aside className="flex flex-col items-center gap-4 rounded-xl bg-gradient-to-b from-primary/10 to-primary/5 px-4 py-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-heading-sm font-bold text-accent-text">NFT EM DESTAQUE</p>
        <p className="text-title font-bold text-foreground">OFERTA LIMITADA</p>
      </div>

      {isLoading ? (
        <Skeleton className="aspect-square w-full rounded-[22px]" />
      ) : nft ? (
        <Link to="/nft/$idOrSlug" params={{ idOrSlug: nft.slug }} className="flex w-full flex-col gap-3">
          <img
            src={nft.imageUrl}
            alt={nft.title}
            loading="lazy"
            className="aspect-square w-full rounded-[22px] object-cover"
          />
          <div className="flex items-center justify-between">
            <span className="truncate text-body text-foreground">{nft.title}</span>
            <span className="text-body-lg font-bold text-accent-text">
              {formatEth(nft.priceEth)} ETH
            </span>
          </div>
        </Link>
      ) : (
        <p className="text-body-sm text-muted-foreground">Nenhum NFT em destaque no momento.</p>
      )}
    </aside>
  );
}
