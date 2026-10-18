import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, Heart, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import type { Nft } from "@/contracts";
import { formatEth, mulEth, parseQuantity } from "@/contracts";
import { useSession } from "@/lib/auth/use-session";
import { useToggleFavorite } from "@/lib/favorites/use-toggle-favorite";
import { isApiCode } from "@/lib/http/errors";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  errorMessage,
  isRetryable,
  resolveApiRequestError,
} from "@/components/state";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAddToCart } from "./use-add-to-cart";
import { useFavoritesStatus } from "./use-favorites-status";
import { useNftDetail } from "./use-nft-detail";
import { QuantitySelector } from "./quantity-selector";

/**
 * Tela de detalhe do NFT (A1): troca o `component` do esqueleto registrado pela `catalog` em
 * `/nft/$idOrSlug`. Rota pública — ações que exigem sessão (favoritar/comprar) são gated aqui
 * dentro (A5), sem depender de guarda de rota.
 */
export function NftDetailScreen() {
  const { idOrSlug } = useParams({ from: "/nft/$idOrSlug" });
  const query = useNftDetail(idOrSlug);

  if (query.isPending) {
    return <NftDetailSkeleton />;
  }

  if (query.isError) {
    const detail = resolveApiRequestError(query.error);
    if (isApiCode(detail, "not_found")) {
      return <NftNotFound />;
    }
    return (
      <ErrorState
        error={query.error}
        title="Não foi possível carregar o NFT"
        onRetry={() => query.refetch()}
        retryable={isRetryable(detail)}
      />
    );
  }

  return <NftDetailContent nft={query.data} />;
}

/** Estado dedicado de "NFT não encontrado" (404) — não usa o `notFoundComponent` do router, pois o
 *  erro vem da query, não de uma rota inexistente (critério de aceitação 3). */
function NftNotFound() {
  return (
    <EmptyState
      title="NFT não encontrado"
      description="O item que você procura não existe ou foi removido."
      action={
        <Button asChild>
          <Link to="/">Voltar ao catálogo</Link>
        </Button>
      }
    />
  );
}

/** Skeleton com as mesmas dimensões do layout real — sem layout shift (§8). */
function NftDetailSkeleton() {
  return (
    <LoadingState label="Carregando NFT…">
      <div className="flex flex-col gap-8">
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-48" />
            <Skeleton className="h-12 w-72" />
          </div>
        </div>
      </div>
    </LoadingState>
  );
}

function NftDetailContent({ nft }: { nft: Nft }) {
  const currentHref = useRouterState({ select: (s) => s.location.href });
  const navigate = useNavigate();
  const { isAuthenticated } = useSession();
  const { isFavorited } = useFavoritesStatus(nft.id, isAuthenticated);
  const toggleFavorite = useToggleFavorite();
  const addToCart = useAddToCart();

  const soldOut = nft.editionsAvailable === 0;
  const [quantity, setQuantity] = useState(1);

  // Reclampa a quantidade quando `editionsAvailable` cai (realtime `nft.updated`, A4/§7). A UI só
  // lê o cache — nenhum código de socket aqui; o efeito só reage ao valor já atualizado.
  useEffect(() => {
    setQuantity((current) => {
      if (nft.editionsAvailable <= 0) return current;
      return Math.min(current, nft.editionsAvailable);
    });
  }, [nft.editionsAvailable]);

  const loginSearch = { redirect: currentHref };

  function handleFavorite() {
    if (!isAuthenticated) return; // gating A5: sem sessão, não chama API — o <Link> abaixo navega.
    toggleFavorite.mutate(nft.id);
  }

  /** Mutation compartilhada por "Adicionar ao carrinho" e "Comprar" (A7); só o `onSuccess` difere. */
  function submitAddToCart(onAdded: () => void) {
    if (!isAuthenticated || soldOut) return; // gating A5 + estoque.
    addToCart.mutate(
      { nftId: nft.id, quantity: parseQuantity(quantity) },
      {
        onSuccess: onAdded,
        onError: (error) => {
          const detail = resolveApiRequestError(error);
          // Só a mensagem fixa para o reason "disponibilidade"; demais `conflict` (idempotência,
          // cupom, preço, registro) caem na mensagem do contrato — reason é defensivo, não suposto.
          if (
            detail.kind === "api" &&
            detail.error.code === "conflict" &&
            detail.error.reason === "availability"
          ) {
            toast.error("Edição indisponível — a disponibilidade mudou.");
            return;
          }
          toast.error(errorMessage(detail));
        },
      },
    );
  }

  function handleBuy() {
    submitAddToCart(() => {
      // Navegação SPA tipada: preserva o `keys.cart` recém-gravado no cache (full reload
      // re-bootstraparia QueryClient/MSW e descartaria o estado reconciliado).
      void navigate({ to: "/cart" });
    });
  }

  function handleAddToCart() {
    submitAddToCart(() => {
      toast.success("Adicionado ao carrinho.", {
        action: {
          label: "Ver carrinho",
          onClick: () => void navigate({ to: "/cart" }),
        },
      });
    });
  }

  const lineTotal = mulEth(nft.priceEth, quantity);

  /**
   * Botão "Comprar" (A7), renderizado tanto no painel desktop quanto na Buy Bar fixa mobile — só
   * um dos dois fica visível por vez (`hidden`/`lg:hidden`), mas ambos existem no DOM. Por isso
   * recebe `testId` por chamada (nunca os dois com o mesmo `data-testid` simultaneamente).
   */
  function renderBuyButton(testId: string) {
    return isAuthenticated ? (
      <Button
        data-testid={testId}
        disabled={soldOut || addToCart.isPending}
        aria-busy={addToCart.isPending}
        aria-disabled={soldOut}
        onClick={handleBuy}
        className="w-full lg:w-auto"
      >
        {soldOut ? "Esgotado" : addToCart.isPending ? "Comprando…" : "Comprar NFT"}
      </Button>
    ) : (
      <Button asChild aria-disabled={soldOut} className="w-full lg:w-auto">
        <Link
          to="/login"
          search={loginSearch}
          data-testid={testId}
          onClick={(e) => soldOut && e.preventDefault()}
        >
          {soldOut ? "Esgotado" : "Comprar NFT"}
        </Link>
      </Button>
    );
  }

  return (
    <div data-testid="nft-detail" className="flex flex-col gap-8 pb-28 lg:pb-0">
      {/* Voltar (mobile): seta → histórico/`/`. Desktop usa o breadcrumb abaixo. */}
      <button
        type="button"
        aria-label="Voltar"
        onClick={() => navigate({ to: "/" })}
        className="flex size-9 items-center justify-center rounded-full border border-border bg-surface-raised text-secondary-text transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
      </button>

      <nav aria-label="Breadcrumb" className="hidden text-body-sm font-bold text-foreground lg:block">
        <Link to="/" className="hover:text-accent-text">
          Início
        </Link>
        <span className="px-1 text-secondary-text">/</span>
        <span>{nft.title}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Galeria (A9): única imagem real; thumbnail repetida/decorativa, sem fingir variações. */}
        <div className="flex gap-4">
          <div className="hidden flex-col gap-4 sm:flex">
            <div
              aria-hidden="true"
              className="size-[88px] overflow-hidden rounded-md border-2 border-primary bg-surface-card"
            >
              <img src={nft.imageUrl} alt="" className="size-full object-cover" />
            </div>
          </div>
          <div className="flex-1 rounded-md bg-surface-card p-4">
            <img
              src={nft.imageUrl}
              alt={nft.title}
              fetchPriority="high"
              className="aspect-square w-full rounded-[24px] object-cover"
            />
          </div>
        </div>

        {/* Painel de detalhes */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <h1 className="text-heading font-bold text-foreground">{nft.title}</h1>
            <p className="text-title font-bold text-accent-text">{formatEth(nft.priceEth)} ETH</p>
          </div>

          <Separator className="bg-primary/40" />

          <div className="flex flex-col gap-3">
            <h2 className="text-body-sm font-bold text-foreground">Sobre este NFT:</h2>
            <p className="text-label leading-6 text-secondary-text">{nft.description}</p>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-body-sm font-bold text-foreground">Edição:</h2>
            {soldOut ? (
              <span className="inline-flex w-fit items-center rounded-md border border-border bg-surface-raised px-3 py-1 text-label font-bold text-destructive">
                Esgotado
              </span>
            ) : (
              <span className="text-label text-secondary-text">
                Edições: {nft.editionsAvailable} de {nft.editionsTotal} disponíveis
              </span>
            )}
          </div>

          {/* Seletor de quantidade: oculto no mobile (vive na Buy Bar fixa abaixo). */}
          <QuantitySelector
            value={quantity}
            max={nft.editionsAvailable}
            onChange={setQuantity}
            disabled={soldOut}
            className="hidden lg:flex"
          />

          {quantity > 1 && !soldOut && (
            <p className="hidden text-body-sm text-secondary-text lg:block">
              Subtotal: <span className="font-bold text-accent-text">{formatEth(lineTotal)} ETH</span>
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {/* Comprar: oculto no mobile (vive na Buy Bar fixa abaixo). */}
            <span className="hidden lg:contents">{renderBuyButton("buy-button-desktop")}</span>

            {isAuthenticated ? (
              <Button
                variant="outline"
                disabled={soldOut || addToCart.isPending}
                aria-busy={addToCart.isPending}
                onClick={handleAddToCart}
              >
                <ShoppingCart aria-hidden="true" />
                Adicionar ao carrinho
              </Button>
            ) : (
              <Button variant="outline" asChild aria-disabled={soldOut}>
                <Link
                  to="/login"
                  search={loginSearch}
                  onClick={(e) => soldOut && e.preventDefault()}
                >
                  <ShoppingCart aria-hidden="true" />
                  Adicionar ao carrinho
                </Link>
              </Button>
            )}

            {isAuthenticated ? (
              <Button
                variant="outline"
                aria-pressed={isFavorited}
                aria-label={isFavorited ? "Remover dos favoritos" : "Favoritar"}
                onClick={handleFavorite}
              >
                <Heart
                  aria-hidden="true"
                  className={cn(isFavorited && "fill-accent-text text-accent-text")}
                />
                {isFavorited ? "Favoritado" : "Favoritar"}
              </Button>
            ) : (
              <Button variant="outline" asChild>
                <Link to="/login" search={loginSearch} aria-label="Favoritar">
                  <Heart aria-hidden="true" />
                  Favoritar
                </Link>
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-2 text-body-sm text-secondary-text">
            <p>ID do token: #{nft.id}</p>
            <p>Coleção: {nft.collection}</p>
            <p>Criador: {nft.creator}</p>
            {nft.attributes.length > 0 && (
              <p>Atributos: {nft.attributes.map((a) => a.value).join(", ")}</p>
            )}
          </div>
        </div>
      </div>

      {/* Buy Bar fixa (mobile, A1 §Telas/critério 1): preço + Qtd + Comprar, sempre visível e sem
          cobrir conteúdo (a raiz tem `pb-28` reservando espaço). Desktop mantém o painel acima. */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-3 rounded-t-[40px] border-t border-border bg-surface-card px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-lg lg:hidden"
        data-testid="buy-bar"
      >
        <div className="flex items-center justify-between gap-4">
          <QuantitySelector
            value={quantity}
            max={nft.editionsAvailable}
            onChange={setQuantity}
            disabled={soldOut}
          />
          <p className="text-title font-bold text-accent-text">{formatEth(nft.priceEth)} ETH</p>
        </div>
        {renderBuyButton("buy-button")}
      </div>
    </div>
  );
}
