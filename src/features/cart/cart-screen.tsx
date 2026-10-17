import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Cart, CartItem } from "@/contracts";
import { addEth, formatEth, mulEth, parseQuantity } from "@/contracts";
import { useSession } from "@/lib/auth/use-session";
import { isApiCode } from "@/lib/http/errors";
import { cn } from "@/lib/utils";
import { keys } from "@/lib/query/keys";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  errorMessage,
  isRetryable,
  resolveApiRequestError,
} from "@/components/state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { isQuoteStale } from "@/lib/cart/quote-stale";
import { useCart } from "@/lib/cart/use-cart";
import { useQuote } from "@/lib/cart/use-quote";
import { CartQuantityStepper } from "./cart-quantity-stepper";
import { useRemoveCartItem } from "./use-remove-cart-item";
import { useUpdateCartItem } from "./use-update-cart-item";

/**
 * Tela do carrinho (`/cart`, A1): troca o `component` do esqueleto registrado pela `foundation`.
 * Rota pública — visitante monta o carrinho; a autenticação é pedida só ao finalizar (checkout).
 */
export function CartScreen() {
  const query = useCart();

  if (query.isPending) {
    return <CartSkeleton />;
  }

  if (query.isError) {
    return (
      <ErrorState
        error={query.error}
        title="Não foi possível carregar o carrinho"
        onRetry={() => query.refetch()}
        retryable={isRetryable(resolveApiRequestError(query.error))}
      />
    );
  }

  if (query.data.items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingCart />}
        title="Seu carrinho está vazio."
        description="Explore o mercado e encontre o próximo NFT da sua coleção."
        action={
          <Button asChild>
            <Link to="/">Explorar o mercado</Link>
          </Button>
        }
      />
    );
  }

  return <CartContent cart={query.data} />;
}

/** Skeleton com as mesmas dimensões do layout real — sem layout shift (§8). */
function CartSkeleton() {
  return (
    <LoadingState label="Carregando carrinho…">
      <div className="flex flex-col gap-8">
        <Skeleton className="h-4 w-56" />
        <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
          <div className="flex flex-col gap-3 lg:w-[782px]">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[70px] w-full rounded-md" />
            ))}
          </div>
          <Skeleton className="h-[388px] w-full rounded-md lg:w-[332px]" />
        </div>
      </div>
    </LoadingState>
  );
}

function CartContent({ cart }: { cart: Cart }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useSession();
  const updateCartItem = useUpdateCartItem();
  const removeCartItem = useRemoveCartItem();

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | undefined>(undefined);

  const quoteQuery = useQuote(cart.version, cart.items.length, appliedCoupon);
  const quote = quoteQuery.data;
  const quoteErrorDetail = quoteQuery.isError ? resolveApiRequestError(quoteQuery.error) : undefined;

  // A1: só o 401 real do visitante (sem sessão) vira a preview — nunca outros erros (ex.: §7
  // `conflict/price_changed`), que teriam uma mensagem enganosa nesse caminho.
  const visitorUnauthenticated =
    quoteErrorDetail !== undefined && isApiCode(quoteErrorDetail, "unauthenticated");

  // §7/corrida: `cartVersion` da cotação ficou desatualizado (reason `price_changed`) — recupera
  // sozinho: invalida `keys.cart` (reconcilia a versão mais nova do servidor) e refaz a cotação.
  // `createQuote` já é chaveado por `cart.version`, então a invalidação da leitura do carrinho
  // propaga pra uma nova `keys.quote` automaticamente quando `cart.version` mudar no cache.
  const quotePriceChanged =
    quoteErrorDetail !== undefined &&
    quoteErrorDetail.kind === "api" &&
    quoteErrorDetail.error.code === "conflict" &&
    quoteErrorDetail.error.reason === "price_changed";

  useEffect(() => {
    if (quotePriceChanged) {
      void queryClient.invalidateQueries({ queryKey: keys.cart });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotePriceChanged]);

  // A8: divergência preço/quantidade por linha entre carrinho e cotação — nunca por `version`.
  const quoteStale = quote ? isQuoteStale(cart, quote) : false;

  // `nft.updated` patcheia os itens de `keys.cart` sem alterar `cart.version` (A8) — a chave da
  // cotação não muda sozinha nesse caso. Quando a comparação por linha detecta obsolescência,
  // refaz a cotação explicitamente (§7) para o resumo refletir os novos valores.
  useEffect(() => {
    if (quoteStale) {
      void quoteQuery.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteStale]);

  // Pré-visualização local do subtotal para visitante (A1) — único uso de helper decimal
  // permitido fora da cotação; nunca fabrica desconto/taxa.
  const localSubtotal = useMemo(
    () =>
      cart.items.reduce(
        (sum, item) => addEth(sum, mulEth(item.unitPriceEth, item.quantity)),
        "0",
      ),
    [cart.items],
  );

  function handleQuantityChange(item: CartItem, nextQuantity: number) {
    if (nextQuantity === item.quantity) return;
    updateCartItem.mutate(
      { nftId: item.nftId, quantity: parseQuantity(nextQuantity) },
      {
        onError: (error) => {
          const detail = resolveApiRequestError(error);
          if (
            detail.kind === "api" &&
            detail.error.code === "conflict" &&
            detail.error.reason === "availability"
          ) {
            toast.error("Quantidade acima das edições disponíveis.");
            return;
          }
          if (isApiCode(detail, "not_found")) {
            toast.error("Este item não está mais no carrinho.");
            return;
          }
          toast.error(errorMessage(detail));
        },
      },
    );
  }

  function handleRemove(item: CartItem) {
    removeCartItem.mutate(item.nftId, {
      onError: (error) => {
        const detail = resolveApiRequestError(error);
        toast.error(errorMessage(detail));
      },
    });
  }

  function handleApplyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    setAppliedCoupon(code);
  }

  function handleRemoveCoupon() {
    setCouponInput("");
    setAppliedCoupon(undefined);
  }

  return (
    <div data-testid="cart" className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="text-body-sm font-bold text-foreground">
        <Link to="/" className="hover:text-accent-text">
          Início
        </Link>
        <span className="px-1 text-secondary-text">/</span>
        <span className="text-secondary-text">Mercado</span>
        <span className="px-1 text-secondary-text">/</span>
        <span>Carrinho</span>
      </nav>

      <h1 className="text-heading-sm font-bold text-foreground lg:hidden">Carrinho de NFTs</h1>

      <div className="flex flex-col gap-8 lg:flex-row lg:justify-between lg:gap-6">
        <CartTable
          cart={cart}
          quote={quote}
          onQuantityChange={handleQuantityChange}
          onRemove={handleRemove}
          updateCartItem={updateCartItem}
          removeCartItem={removeCartItem}
        />

        <WalletSummary
          cart={cart}
          quote={quote}
          quoteQuery={quoteQuery}
          quoteStale={quoteStale}
          isAuthenticated={isAuthenticated}
          visitorUnauthenticated={visitorUnauthenticated}
          quotePriceChanged={quotePriceChanged}
          localSubtotal={localSubtotal}
          couponInput={couponInput}
          appliedCoupon={appliedCoupon}
          onCouponInputChange={setCouponInput}
          onApplyCoupon={handleApplyCoupon}
          onRemoveCoupon={handleRemoveCoupon}
          onCheckout={() => void navigate({ to: "/checkout" })}
        />
      </div>
    </div>
  );
}

interface CartTableProps {
  cart: Cart;
  quote: ReturnType<typeof useQuote>["data"];
  onQuantityChange: (item: CartItem, next: number) => void;
  onRemove: (item: CartItem) => void;
  updateCartItem: ReturnType<typeof useUpdateCartItem>;
  removeCartItem: ReturnType<typeof useRemoveCartItem>;
}

function CartTable({
  cart,
  quote,
  onQuantityChange,
  onRemove,
  updateCartItem,
  removeCartItem,
}: CartTableProps) {
  return (
    <section aria-label="Itens do carrinho" className="flex flex-col gap-3 lg:w-[782px]">
      <div className="hidden items-center justify-between border-b border-primary/30 pb-3 text-body-lg font-bold text-foreground lg:flex">
        <span className="w-[250px]">NFTs</span>
        <span className="w-[77px] text-center font-medium">Preço</span>
        <span className="w-[75px] font-bold">Edições</span>
        <span className="w-[87px] text-right font-medium">Total</span>
        <span className="w-6" aria-hidden="true" />
      </div>

      <ul className="flex flex-col gap-3 lg:gap-3">
        {cart.items.map((item) => {
          const quoteLine = quote?.items.find((line) => line.nftId === item.nftId);
          const unitPriceEth = quoteLine?.unitPriceEth ?? item.unitPriceEth;
          const lineTotalEth = quoteLine?.lineTotalEth ?? mulEth(item.unitPriceEth, item.quantity);
          const isMutatingThis =
            (updateCartItem.isPending && updateCartItem.variables?.nftId === item.nftId) ||
            (removeCartItem.isPending && removeCartItem.variables === item.nftId);
          const availabilityReduced = item.quantity > item.availableEditions;

          return (
            <li
              key={item.nftId}
              data-testid={`cart-item-${item.nftId}`}
              aria-busy={isMutatingThis}
              className="flex flex-col gap-3 rounded-md bg-surface-card p-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:px-6 lg:py-0 lg:h-[70px]"
            >
              <div className="flex items-center gap-4 lg:w-[250px]">
                <Link to="/nft/$idOrSlug" params={{ idOrSlug: item.nftId }} className="shrink-0">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="size-[70px] rounded-md object-cover lg:size-[70px]"
                  />
                </Link>
                <div className="flex flex-col gap-1.5 overflow-hidden">
                  <Link
                    to="/nft/$idOrSlug"
                    params={{ idOrSlug: item.nftId }}
                    className="truncate text-body-lg font-bold text-foreground hover:text-accent-text"
                  >
                    {item.title}
                  </Link>
                  <span className="text-body-sm text-secondary-text lg:hidden">
                    Edição: {item.quantity}/{item.availableEditions}
                  </span>
                  <span className="hidden text-body-sm text-secondary-text lg:block">
                    ID do token: #{item.nftId}
                  </span>
                  {availabilityReduced && (
                    <span
                      role="status"
                      className="inline-flex w-fit items-center rounded-md bg-surface-raised px-2 py-0.5 text-caption font-bold text-destructive"
                    >
                      Disponibilidade reduzida
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 lg:contents">
                <span className="text-body-sm font-bold text-secondary-text lg:w-[77px] lg:text-center">
                  {formatEth(unitPriceEth)} ETH
                </span>

                <CartQuantityStepper
                  value={item.quantity}
                  max={item.availableEditions}
                  busy={isMutatingThis}
                  disabled={isMutatingThis}
                  onChange={(next) => onQuantityChange(item, next)}
                  className="lg:w-[75px]"
                />

                <span className="text-body-lg font-bold text-accent-text lg:w-[87px] lg:text-right">
                  {formatEth(lineTotalEth)} ETH
                </span>

                <button
                  type="button"
                  aria-label={`Remover ${item.title} do carrinho`}
                  disabled={isMutatingThis}
                  onClick={() => onRemove(item)}
                  className="flex size-8 items-center justify-center rounded-full text-secondary-text transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 lg:size-6"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

interface WalletSummaryProps {
  cart: Cart;
  quote: ReturnType<typeof useQuote>["data"];
  quoteQuery: ReturnType<typeof useQuote>;
  quoteStale: boolean;
  isAuthenticated: boolean;
  visitorUnauthenticated: boolean;
  quotePriceChanged: boolean;
  localSubtotal: string;
  couponInput: string;
  appliedCoupon: string | undefined;
  onCouponInputChange: (value: string) => void;
  onApplyCoupon: () => void;
  onRemoveCoupon: () => void;
  onCheckout: () => void;
}

function WalletSummary({
  cart,
  quote,
  quoteQuery,
  quoteStale,
  isAuthenticated,
  visitorUnauthenticated,
  quotePriceChanged,
  localSubtotal,
  couponInput,
  appliedCoupon,
  onCouponInputChange,
  onApplyCoupon,
  onRemoveCoupon,
  onCheckout,
}: WalletSummaryProps) {
  // Qualquer erro de cotação que NÃO seja o 401 do visitante (A1) precisa de um `ErrorState` com
  // retry — nunca cair na preview de visitante. Cobre falhas de rede/transitórias (§4) e a
  // reconciliação de `price_changed` (§7/corrida): a invalidação de `keys.cart` já foi disparada
  // no efeito acima; aqui só mostramos o estado enquanto ela não resolve.
  const showQuoteErrorState = quoteQuery.isError && !visitorUnauthenticated;
  const quoteErrorRetryable =
    showQuoteErrorState &&
    (quotePriceChanged || isRetryable(resolveApiRequestError(quoteQuery.error)));

  const couponMessage =
    quote?.coupon && !quote.coupon.valid
      ? quote.coupon.reason === "expired"
        ? "Cupom expirado."
        : "Cupom inválido."
      : undefined;
  // O input se associa ao `#coupon-status` tanto em erro quanto em sucesso (mesmo id, role
  // diferente) — sem isso a mensagem de cupom válido fica desconectada do campo pra leitor de tela.
  const hasCouponStatus = couponMessage !== undefined || quote?.coupon?.valid === true;

  return (
    <aside
      aria-label="Resumo da carteira"
      className="flex w-full flex-col gap-6 rounded-md bg-surface-card p-4 lg:w-[332px] lg:bg-transparent lg:p-0"
    >
      <div className="flex flex-col gap-3">
        <h2 className="text-body-lg font-bold text-foreground">Resumo da carteira</h2>
        <Separator className="bg-primary/30" />
      </div>

      {isAuthenticated ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="coupon-code" className="text-body-sm font-bold">
            Código promocional
          </Label>
          <div className="flex items-center overflow-hidden rounded-[3px] border border-primary">
            <Input
              id="coupon-code"
              placeholder="Digite o código promocional..."
              value={couponInput}
              onChange={(e) => onCouponInputChange(e.target.value)}
              aria-describedby={hasCouponStatus ? "coupon-status" : undefined}
              className="h-10 flex-1 rounded-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {appliedCoupon ? (
              <Button
                type="button"
                variant="default"
                className="h-10 rounded-none rounded-r-[3px]"
                onClick={onRemoveCoupon}
              >
                Remover
              </Button>
            ) : (
              <Button
                type="button"
                variant="default"
                className="h-10 rounded-none rounded-r-[3px]"
                onClick={onApplyCoupon}
                disabled={!couponInput.trim()}
              >
                Aplicar
              </Button>
            )}
          </div>
          {couponMessage && (
            <p id="coupon-status" role="alert" className="text-caption text-destructive">
              {couponMessage}
            </p>
          )}
          {quote?.coupon?.valid && (
            <p id="coupon-status" role="status" className="text-caption text-success">
              Cupom aplicado com sucesso.
            </p>
          )}
        </div>
      ) : (
        <p role="status" className="text-body-sm text-secondary-text">
          Entre para aplicar cupom e ver a taxa.
        </p>
      )}

      {quoteStale && (
        <p role="status" aria-live="polite" className="text-body-sm font-bold text-destructive">
          O preço de um item mudou. Revise o resumo.
        </p>
      )}

      {showQuoteErrorState ? (
        <ErrorState
          error={quoteQuery.error}
          title={
            quotePriceChanged
              ? "O carrinho mudou — recalculando o resumo"
              : "Não foi possível calcular o resumo"
          }
          onRetry={() => quoteQuery.refetch()}
          retryable={quoteErrorRetryable}
          className="py-6"
        />
      ) : quoteQuery.isPending && cart.items.length > 0 && isAuthenticated ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
        </div>
      ) : (
        <SummaryFigures
          quote={quote}
          isAuthenticated={isAuthenticated}
          visitorUnauthenticated={visitorUnauthenticated}
          localSubtotal={localSubtotal}
        />
      )}

      <div className="flex flex-col items-center gap-3">
        <Button onClick={onCheckout} className="w-full" data-testid="checkout-cta">
          Conectar e finalizar
        </Button>
        <Link to="/" className="text-body-sm text-accent-text hover:underline">
          Continuar explorando
        </Link>
      </div>
    </aside>
  );
}

function SummaryFigures({
  quote,
  isAuthenticated,
  visitorUnauthenticated,
  localSubtotal,
}: {
  quote: ReturnType<typeof useQuote>["data"];
  isAuthenticated: boolean;
  visitorUnauthenticated: boolean;
  localSubtotal: string;
}) {
  if (!isAuthenticated || visitorUnauthenticated || !quote) {
    // Visitante (A1): pré-visualização rotulada como não-final, sem fabricar desconto/taxa.
    return (
      <div className="flex flex-col gap-3">
        <Row label="Subtotal (estimado)" value={`${formatEth(localSubtotal)} ETH`} />
        <p className="text-caption text-accent-text">
          Valores finais (desconto e taxa de rede) confirmados no checkout, após entrar.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Row label="Subtotal" value={`${formatEth(quote.subtotalEth)} ETH`} />
      <Row
        label="Desconto do lançamento"
        value={
          quote.coupon?.valid
            ? `(-) ${formatEth(quote.discountEth)} ETH`
            : `(-) ${formatEth("0")} ETH`
        }
      />
      <div className="flex flex-col gap-1">
        <Row label="Taxa de rede" value={`${formatEth(quote.networkFeeEth)} ETH`} />
        <span className="text-caption text-accent-text">Taxa estimada</span>
      </div>
      <Separator className="bg-primary/20" />
      <Row
        label="Total"
        value={`${formatEth(quote.totalEth)} ETH`}
        emphasis
      />
    </div>
  );
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn("text-body-sm", emphasis ? "text-body-lg font-bold text-foreground" : "text-foreground")}>
        {label}
      </span>
      <span
        className={cn(
          "text-body-sm font-medium text-foreground",
          emphasis && "text-body-lg font-bold text-accent-text",
        )}
      >
        {value}
      </span>
    </div>
  );
}
