import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingCart, Wallet as WalletIcon } from "lucide-react";
import { toast } from "sonner";
import type { Cart, CreateOrderRequest, Order, Quote, Wallet, WalletId } from "@/contracts";
import { formatEth } from "@/contracts";
import { isQuoteStale } from "@/lib/cart/quote-stale";
import { useCart } from "@/lib/cart/use-cart";
import { useQuote } from "@/lib/cart/use-quote";
import { useSession } from "@/lib/auth/use-session";
import { useWallets } from "@/lib/wallets/use-wallets";
import { keys } from "@/lib/query/keys";
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { clearPendingOrderId, readPendingOrderId, writePendingOrderId } from "./pending-order-storage";
import { useCreateOrder } from "./use-create-order";
import { useOrder } from "./use-order";

/** Estado local de conexão simulado (A4) — nunca persistido, nunca chama rede. */
type ConnectionState = "disconnected" | "connecting" | "connected";

/**
 * Tela de checkout (`/checkout`, A1): troca o `component` do placeholder privado registrado pela
 * `cart`. Revalida a cotação, coleta carteira/rede com conexão simulada, cria o pedido de forma
 * idempotente e navega para `/order/$orderId` — a UI só lê o cache do pedido (A9), nunca fabrica um
 * estado terminal.
 */
export function CheckoutScreen() {
  const { session, isAuthenticated, isPending: sessionPending } = useSession();
  const navigate = useNavigate();
  const cartQuery = useCart();

  // A10: sessão expirada durante o fluxo — o 401 global já faz teardown (zera `keys.session`); aqui
  // só navegamos, sem finalizar nada.
  useEffect(() => {
    if (!sessionPending && !isAuthenticated) {
      void navigate({ to: "/login", search: { redirect: "/checkout" } });
    }
  }, [sessionPending, isAuthenticated, navigate]);

  // A9: recuperação pós-refresh/reconexão — se há um pending-order salvo, reconcilia via `getOrder`
  // antes de montar o fluxo de nova compra (nunca cria um segundo pedido para o mesmo carrinho).
  const [pendingOrderId] = useState(() => readPendingOrderId());
  const pendingOrderQuery = useOrder(pendingOrderId);

  useEffect(() => {
    if (!pendingOrderQuery.data) return;
    const order = pendingOrderQuery.data;
    if (order.status !== "pending") {
      // Terminal: a tela de confirmação assume a partir daqui.
      clearPendingOrderId();
      void navigate({ to: "/order/$orderId", params: { orderId: order.id } });
    }
  }, [pendingOrderQuery.data, navigate]);

  if (sessionPending || !isAuthenticated) {
    return <CheckoutSkeleton />;
  }

  if (cartQuery.isPending) {
    return <CheckoutSkeleton />;
  }

  if (cartQuery.isError) {
    return (
      <ErrorState
        error={cartQuery.error}
        title="Não foi possível carregar o carrinho"
        onRetry={() => cartQuery.refetch()}
        retryable={isRetryable(resolveApiRequestError(cartQuery.error))}
      />
    );
  }

  if (cartQuery.data.items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingCart />}
        title="Seu carrinho está vazio."
        description="Não há o que cotar ou comprar — volte ao carrinho ou explore o mercado."
        action={
          <div className="flex gap-3">
            <Button asChild variant="outline">
              <Link to="/cart">Ver carrinho</Link>
            </Button>
            <Button asChild>
              <Link to="/">Explorar o mercado</Link>
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <CheckoutContent
      cart={cartQuery.data}
      displayName={session?.user.displayName ?? ""}
      email={session?.user.email ?? ""}
      pendingOrderId={pendingOrderQuery.data?.status === "pending" ? pendingOrderId : undefined}
    />
  );
}

function CheckoutSkeleton() {
  return (
    <LoadingState label="Carregando pagamento…">
      <div className="flex flex-col gap-8">
        <Skeleton className="h-4 w-56" />
        <div className="flex flex-col gap-8 lg:flex-row lg:justify-between lg:gap-8">
          <div className="flex flex-col gap-6 lg:w-[763px]">
            <Skeleton className="h-4 w-48" />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[69px] w-full" />
              ))}
            </div>
          </div>
          <Skeleton className="h-[780px] w-full rounded-md lg:w-[405px]" />
        </div>
      </div>
    </LoadingState>
  );
}

interface CheckoutContentProps {
  cart: Cart;
  displayName: string;
  email: string;
  /** Pedido pendente recuperado (A9) — assume o estado "confirmando" sem criar outro pedido. */
  pendingOrderId: string | undefined;
}

function CheckoutContent({ cart, displayName, email, pendingOrderId }: CheckoutContentProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const quoteQuery = useQuote(cart.version, cart.items.length);
  const quote = quoteQuery.data;
  const quoteStale = quote ? isQuoteStale(cart, quote) : false;

  const walletsQuery = useWallets(true);
  const createOrderMutation = useCreateOrder();

  const [connection, setConnection] = useState<ConnectionState>("disconnected");
  const [connectionNotice, setConnectionNotice] = useState<string | undefined>(undefined);
  const [selectedWalletId, setSelectedWalletId] = useState<WalletId | undefined>(undefined);
  const [selectedNetwork, setSelectedNetwork] = useState<string | undefined>(undefined);

  const walletsData = walletsQuery.data;
  const wallets = walletsData ?? [];
  const selectedWallet = wallets.find((w) => w.id === selectedWalletId);

  // Carteira padrão: a primeira da lista, uma vez carregada (A4 — não inventa carteira).
  useEffect(() => {
    if (!selectedWalletId && walletsData && walletsData.length > 0) {
      setSelectedWalletId(walletsData[0].id);
      setSelectedNetwork(walletsData[0].network);
    }
  }, [walletsData, selectedWalletId]);

  // §7: `nft.updated` pode tornar a cotação obsoleta sem mudar `cart.version` (A8) — refaz a
  // cotação automaticamente para o resumo refletir os novos valores; a confirmação continua
  // bloqueada até o usuário revisar (a `isQuoteStale` corrente já bloqueia abaixo).
  useEffect(() => {
    if (quoteStale) {
      void quoteQuery.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteStale]);

  // A7: idempotencyKey por "tentativa de compra" — gerado ao iniciar a confirmação, reusado em
  // retry (timeout/transiente/clique repetido) da MESMA tentativa, renovado quando cotação/carteira/
  // rede mudam materialmente.
  const idempotencyKeyRef = useRef<string | undefined>(undefined);
  const attemptSignatureRef = useRef<string | undefined>(undefined);

  function currentAttemptSignature(): string | undefined {
    if (!quote || !selectedWalletId || !selectedNetwork) return undefined;
    return `${quote.version}:${selectedWalletId}:${selectedNetwork}`;
  }

  function getOrRenewIdempotencyKey(): string {
    const signature = currentAttemptSignature();
    if (idempotencyKeyRef.current && attemptSignatureRef.current === signature) {
      return idempotencyKeyRef.current;
    }
    const nextKey = crypto.randomUUID();
    idempotencyKeyRef.current = nextKey;
    attemptSignatureRef.current = signature;
    return nextKey;
  }

  function renewIdempotencyKey(): void {
    idempotencyKeyRef.current = undefined;
    attemptSignatureRef.current = undefined;
  }

  const connectTimerRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    return () => {
      if (connectTimerRef.current) window.clearTimeout(connectTimerRef.current);
    };
  }, []);

  function handleConnect() {
    setConnection("connecting");
    setConnectionNotice("Conectando…");
    // Atraso curto puramente de UI (A4) — sem chamada de rede, sem fabricar endereço/saldo.
    if (connectTimerRef.current) window.clearTimeout(connectTimerRef.current);
    connectTimerRef.current = window.setTimeout(() => {
      setConnection("connected");
      setConnectionNotice("Carteira conectada.");
    }, 600);
  }

  function handleDisconnect() {
    setConnection("disconnected");
    setConnectionNotice(undefined);
  }

  function handleRefuseConnection() {
    setConnection("disconnected");
    setConnectionNotice("Conexão recusada.");
  }

  function handleWalletChange(walletId: WalletId) {
    const wallet = wallets.find((w) => w.id === walletId);
    setSelectedWalletId(walletId);
    setSelectedNetwork(wallet?.network);
    renewIdempotencyKey();
  }

  function handleNetworkChange(network: string) {
    setSelectedNetwork(network);
    renewIdempotencyKey();
  }

  async function handleReviewAndReconfirm() {
    renewIdempotencyKey();
    await quoteQuery.refetch();
  }

  function handleConfirm() {
    if (!quote || !selectedWalletId || !selectedNetwork) return;
    if (connection !== "connected") return;
    if (quoteStale) return;

    const idempotencyKey = getOrRenewIdempotencyKey();
    const body: CreateOrderRequest = {
      quoteVersion: quote.version,
      walletId: selectedWalletId,
      network: selectedNetwork,
      idempotencyKey,
    };

    createOrderMutation.mutate(body, {
      onSuccess: (order: Order) => {
        writePendingOrderId(order.id);
        void navigate({ to: "/order/$orderId", params: { orderId: order.id } });
      },
      onError: (error) => {
        handleCreateOrderError(error);
      },
    });
  }

  function handleCreateOrderError(error: unknown) {
    const detail = resolveApiRequestError(error);

    if (detail.kind === "network") {
      // Timeout pós-pedido (§6, cenário `order-timeout`): o pedido já pode existir no servidor —
      // "Tentar novamente" reenvia com o MESMO idempotencyKey (replay recupera, não duplica).
      toast.error("Não recebemos confirmação. Tente novamente — vamos reconectar ao mesmo pedido.");
      return;
    }

    if (detail.kind !== "api") return;

    if (detail.error.code === "unauthenticated") {
      // A10: 401 — o interceptor global já faz teardown (zera `keys.session`) e o effect de sessão
      // navega para `/login?redirect=/checkout`. Nada de toast genérico nem finalização aqui.
      return;
    }

    if (detail.error.code === "validation") {
      toast.error("Não foi possível validar os dados da compra. Revise e tente novamente.");
      return;
    }

    if (detail.error.code === "conflict" && detail.error.reason === "price_changed") {
      toast.error("O preço mudou. Revise e confirme novamente.");
      void queryClient.invalidateQueries({ queryKey: keys.cart });
      renewIdempotencyKey();
      return;
    }

    if (detail.error.code === "conflict" && detail.error.reason === "availability") {
      toast.error("Edição esgotada durante a compra. Ajuste o carrinho.");
      void queryClient.invalidateQueries({ queryKey: keys.cart });
      void quoteQuery.refetch();
      return;
    }

    if (detail.error.code === "conflict" && detail.error.reason === "idempotency_mismatch") {
      // Não deveria ocorrer em uso normal (A7) — corrida; renova o key e libera nova tentativa.
      renewIdempotencyKey();
      toast.error("A tentativa anterior ficou obsoleta. Tente confirmar novamente.");
      return;
    }

    if (detail.error.code === "not_found" && detail.error.resource === "wallet") {
      toast.error("Carteira não encontrada. Atualizando a lista de carteiras.");
      void queryClient.invalidateQueries({ queryKey: keys.wallets });
      return;
    }

    if (detail.error.code === "not_found" && detail.error.resource === "nft") {
      toast.error("Um item deste pedido não está mais disponível.");
      void queryClient.invalidateQueries({ queryKey: keys.cart });
      void quoteQuery.refetch();
      return;
    }

    if (detail.error.code === "transient") {
      toast.error("Falha temporária. Tente novamente.");
      return;
    }

    if (detail.error.code === "forbidden") {
      toast.error("Sem permissão para concluir esta compra.");
      return;
    }

    toast.error(errorMessage(detail));
  }

  // §7/A5: pré-condições da confirmação — nenhuma delas dispara request; só habilitam/bloqueiam o CTA.
  const hasWallet = Boolean(selectedWalletId && selectedNetwork);
  const hasValidQuote = Boolean(quote) && !quoteStale;
  const isConnected = connection === "connected";
  const orderIsPending = Boolean(pendingOrderId) || createOrderMutation.data?.status === "pending";

  const confirmDisabledReason = !hasWallet
    ? "Selecione uma carteira e uma rede para continuar."
    : !isConnected
      ? "Conecte sua carteira para confirmar a compra."
      : quoteStale
        ? "A cotação está desatualizada. Revise e reconfirme antes de continuar."
        : !hasValidQuote
          ? "Calculando o resumo da compra…"
          : undefined;

  const confirmDisabled =
    Boolean(confirmDisabledReason) || createOrderMutation.isPending || orderIsPending;

  return (
    <div data-testid="checkout" className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="text-body-sm font-bold text-foreground">
        <Link to="/" className="hover:text-accent-text">
          Início
        </Link>
        <span className="px-1 text-secondary-text">/</span>
        <span className="text-secondary-text">Mercado</span>
        <span className="px-1 text-secondary-text">/</span>
        <span>Pagamento</span>
      </nav>

      <h1 className="text-heading-sm font-bold text-foreground lg:hidden">Pagamento com carteira</h1>

      <div className="flex flex-col gap-8 lg:flex-row lg:justify-between lg:gap-8">
        <CollectorProfile
          displayName={displayName}
          email={email}
          wallets={wallets}
          walletsQuery={walletsQuery}
          selectedWallet={selectedWallet}
          selectedNetwork={selectedNetwork}
          onWalletChange={handleWalletChange}
          onNetworkChange={handleNetworkChange}
        />

        <OrderSummaryPanel
          cart={cart}
          quote={quote}
          quoteQuery={quoteQuery}
          quoteStale={quoteStale}
          onReviewAndReconfirm={handleReviewAndReconfirm}
          wallets={wallets}
          walletsQuery={walletsQuery}
          selectedWallet={selectedWallet}
          selectedNetwork={selectedNetwork}
          onWalletChange={handleWalletChange}
          connection={connection}
          connectionNotice={connectionNotice}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onRefuseConnection={handleRefuseConnection}
          onConfirm={handleConfirm}
          confirmDisabled={confirmDisabled}
          confirmDisabledReason={confirmDisabledReason}
          isPending={createOrderMutation.isPending}
          orderIsPending={orderIsPending}
        />
      </div>
    </div>
  );
}

/* ── Coluna esquerda — "Perfil do colecionador" (A3) ─────────────────────── */

interface CollectorProfileProps {
  displayName: string;
  email: string;
  wallets: Wallet[];
  walletsQuery: ReturnType<typeof useWallets>;
  selectedWallet: Wallet | undefined;
  selectedNetwork: string | undefined;
  onWalletChange: (walletId: WalletId) => void;
  onNetworkChange: (network: string) => void;
}

function CollectorProfile({
  displayName,
  email,
  wallets,
  walletsQuery,
  selectedWallet,
  selectedNetwork,
  onWalletChange,
  onNetworkChange,
}: CollectorProfileProps) {
  // A4: a rede é a da carteira selecionada — cada carteira tem exatamente uma rede. Escopar as
  // opções à carteira escolhida impede um pedido com `network` incoerente com a `wallet`.
  const availableNetworks = selectedWallet
    ? [selectedWallet.network]
    : Array.from(new Set(wallets.map((w) => w.network)));
  const [note, setNote] = useState("");

  return (
    <section aria-label="Perfil do colecionador" className="flex flex-col gap-3 lg:w-[763px]">
      <h2 className="text-body-lg font-bold text-foreground">Perfil do colecionador</h2>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field label="Nome de exibição">
          <ReadOnlyValue value={displayName || "—"} />
        </Field>

        <Field label="Rede" htmlFor="checkout-network">
          {walletsQuery.isPending ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <select
              id="checkout-network"
              value={selectedNetwork ?? ""}
              onChange={(e) => onNetworkChange(e.target.value)}
              disabled={availableNetworks.length === 0}
              className="h-10 w-full rounded-[3px] border border-border bg-transparent px-3 text-label text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {availableNetworks.length === 0 && <option value="">Selecione uma rede</option>}
              {availableNetworks.map((network) => (
                <option key={network} value={network}>
                  {network}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label="Endereço da carteira">
          <ReadOnlyValue value={selectedWallet?.address ?? "Endereço 0x da carteira"} muted={!selectedWallet} />
        </Field>

        <Field label="Tipo de carteira" htmlFor="checkout-wallet">
          {walletsQuery.isPending ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <select
              id="checkout-wallet"
              value={selectedWallet?.id ?? ""}
              onChange={(e) => onWalletChange(e.target.value as WalletId)}
              disabled={wallets.length === 0}
              className="h-10 w-full rounded-[3px] border border-border bg-transparent px-3 text-label text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {wallets.length === 0 && <option value="">Selecione uma carteira</option>}
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.label} · {truncateAddress(wallet.address)} · {wallet.role === "primary" ? "Principal" : "Secundária"}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label="E-mail">
          <ReadOnlyValue value={email || "—"} />
        </Field>
      </div>

      {/* A3: campo decorativo, puramente local — nunca enviado ao `createOrder`, sem persistência. */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="checkout-note" className="text-body-sm">
          Observação do colecionador (opcional)
        </Label>
        <textarea
          id="checkout-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          aria-describedby="checkout-note-hint"
          placeholder="Essa observação é só sua — não é enviada com o pedido."
          className="min-h-[96px] w-full rounded-[3px] border border-border bg-transparent p-3 text-label text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p id="checkout-note-hint" className="text-caption text-secondary-text">
          Não é usada na simulação de pagamento; fica só nesta tela.
        </p>
      </div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-body-sm">
        {label}
      </Label>
      {children}
    </div>
  );
}

function ReadOnlyValue({ value, muted }: { value: string; muted?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-10 w-full items-center rounded-[3px] border border-border bg-transparent px-3 text-label",
        muted ? "text-muted-foreground" : "text-foreground",
      )}
    >
      {value}
    </div>
  );
}

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/* ── Coluna direita — "Seus NFTs" + "Carteira e rede" + CTA ──────────────── */

interface OrderSummaryPanelProps {
  cart: Cart;
  quote: Quote | undefined;
  quoteQuery: ReturnType<typeof useQuote>;
  quoteStale: boolean;
  onReviewAndReconfirm: () => void;
  wallets: Wallet[];
  walletsQuery: ReturnType<typeof useWallets>;
  selectedWallet: Wallet | undefined;
  selectedNetwork: string | undefined;
  onWalletChange: (walletId: WalletId) => void;
  connection: ConnectionState;
  connectionNotice: string | undefined;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefuseConnection: () => void;
  onConfirm: () => void;
  confirmDisabled: boolean;
  confirmDisabledReason: string | undefined;
  isPending: boolean;
  orderIsPending: boolean;
}

function OrderSummaryPanel({
  cart,
  quote,
  quoteQuery,
  quoteStale,
  onReviewAndReconfirm,
  wallets,
  walletsQuery,
  selectedWallet,
  selectedNetwork,
  onWalletChange,
  connection,
  connectionNotice,
  onConnect,
  onDisconnect,
  onRefuseConnection,
  onConfirm,
  confirmDisabled,
  confirmDisabledReason,
  isPending,
  orderIsPending,
}: OrderSummaryPanelProps) {
  const quoteErrorDetail = quoteQuery.isError ? resolveApiRequestError(quoteQuery.error) : undefined;

  return (
    <aside aria-label="Seus NFTs e pagamento" className="flex w-full flex-col gap-6 lg:w-[405px]">
      <div className="flex flex-col gap-3">
        <h2 className="text-body-lg font-bold text-foreground">Seus NFTs</h2>

        {quoteQuery.isError ? (
          <ErrorState
            error={quoteQuery.error}
            title="Não foi possível calcular o resumo"
            onRetry={() => quoteQuery.refetch()}
            retryable={isRetryable(quoteErrorDetail!)}
            className="py-6"
          />
        ) : quoteQuery.isPending || !quote ? (
          <ReceiptSkeleton />
        ) : (
          <ReceiptItems cart={cart} quote={quote} />
        )}
      </div>

      {quoteStale && (
        <div
          id="quote-stale-warning"
          role="alert"
          aria-live="polite"
          className="flex flex-col gap-2 rounded-md border border-destructive/50 bg-surface-card p-3"
        >
          <p className="text-body-sm font-bold text-destructive">
            O preço de um item mudou. Revise o resumo.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={onReviewAndReconfirm}>
            Revisar e reconfirmar
          </Button>
        </div>
      )}

      {quote && (
        <SummaryFigures quote={quote} />
      )}

      <WalletAndNetwork
        wallets={wallets}
        walletsQuery={walletsQuery}
        selectedWallet={selectedWallet}
        selectedNetwork={selectedNetwork}
        onWalletChange={onWalletChange}
        connection={connection}
        connectionNotice={connectionNotice}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        onRefuseConnection={onRefuseConnection}
      />

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          data-testid="confirm-purchase"
          onClick={onConfirm}
          disabled={confirmDisabled}
          aria-busy={isPending || orderIsPending}
          aria-describedby={confirmDisabledReason ? "confirm-purchase-reason" : undefined}
          className="w-full"
        >
          {isPending || orderIsPending ? "Confirmando…" : "Confirmar compra"}
        </Button>
        {confirmDisabledReason && (
          <p id="confirm-purchase-reason" role="status" className="text-caption text-secondary-text">
            {confirmDisabledReason}
          </p>
        )}
      </div>
    </aside>
  );
}

function ReceiptSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: 2 }).map((_, i) => (
        <Skeleton key={i} className="h-[70px] w-full rounded-md" />
      ))}
    </div>
  );
}

/** A6: título/imagem do `Cart`, casados por `nftId` com quantidade/preços da `Quote`. */
function ReceiptItems({ cart, quote }: { cart: Cart; quote: Quote }) {
  return (
    <ul className="flex flex-col gap-3">
      {quote.items.map((line) => {
        const cartItem = cart.items.find((item) => item.nftId === line.nftId);
        if (!cartItem) return null;
        return (
          <li
            key={line.nftId}
            data-testid={`checkout-item-${line.nftId}`}
            className="flex items-center gap-3 rounded-md bg-surface-card px-3 py-2"
          >
            <img
              src={cartItem.imageUrl}
              alt={cartItem.title}
              className="size-[70px] shrink-0 rounded-md object-cover"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate text-body-lg font-bold text-foreground">{cartItem.title}</span>
              <span className="text-body-sm text-secondary-text">ID do token: #{cartItem.nftId}</span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-body-sm text-secondary-text">(x {line.quantity})</span>
              <span className="text-body-lg font-bold text-accent-text">
                {formatEth(line.lineTotalEth)} ETH
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function SummaryFigures({ quote }: { quote: Quote }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-body-sm text-secondary-text">Tem um código promocional? Aplique aqui</p>
      <Row label="Subtotal" value={`${formatEth(quote.subtotalEth)} ETH`} />
      <Row
        label="Desconto do lançamento"
        value={quote.coupon?.valid ? `(-) ${formatEth(quote.discountEth)} ETH` : `(-) ${formatEth("0")} ETH`}
      />
      <div className="flex flex-col gap-1">
        <Row label="Taxa de rede" value={`${formatEth(quote.networkFeeEth)} ETH`} />
        <span className="text-caption text-accent-text">Taxa estimada</span>
      </div>
      <Separator className="bg-primary/20" />
      <Row label="Total" value={`${formatEth(quote.totalEth)} ETH`} emphasis />
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

/* ── "Carteira e rede" (A4): seleção + conexão simulada ──────────────────── */

interface WalletAndNetworkProps {
  wallets: Wallet[];
  walletsQuery: ReturnType<typeof useWallets>;
  selectedWallet: Wallet | undefined;
  selectedNetwork: string | undefined;
  onWalletChange: (walletId: WalletId) => void;
  connection: ConnectionState;
  connectionNotice: string | undefined;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefuseConnection: () => void;
}

function WalletAndNetwork({
  wallets,
  walletsQuery,
  selectedWallet,
  selectedNetwork,
  onWalletChange,
  connection,
  connectionNotice,
  onConnect,
  onDisconnect,
  onRefuseConnection,
}: WalletAndNetworkProps) {
  // M-3: "Trocar carteira" desconecta e devolve o foco à seleção (radio marcado), diferenciando-se
  // de "Desconectar" (que só volta ao estado disconnected).
  const selectedRadioRef = useRef<HTMLInputElement>(null);
  function handleSwitchWallet() {
    onDisconnect();
    selectedRadioRef.current?.focus();
  }

  if (walletsQuery.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-body-lg font-bold text-foreground">Carteira e rede</h2>
        <Skeleton className="h-11 w-full" />
      </div>
    );
  }

  if (walletsQuery.isError) {
    return (
      <ErrorState
        error={walletsQuery.error}
        title="Não foi possível carregar suas carteiras"
        onRetry={() => walletsQuery.refetch()}
        retryable={isRetryable(resolveApiRequestError(walletsQuery.error))}
        className="py-6"
      />
    );
  }

  if (wallets.length === 0) {
    return (
      <EmptyState
        icon={<WalletIcon />}
        title="Cadastre uma carteira para finalizar."
        description="Você ainda não tem carteiras cadastradas."
        action={
          <Button asChild>
            <Link to="/wallets">Cadastrar carteira</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-body-lg font-bold text-foreground">Carteira e rede</h2>

      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Selecione uma carteira</legend>
        {wallets.map((wallet) => {
          const checked = wallet.id === selectedWallet?.id;
          return (
            <label
              key={wallet.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-[3px] border px-4 py-3 text-body-sm text-foreground transition-colors",
                checked ? "border-primary" : "border-border",
              )}
            >
              <input
                ref={checked ? selectedRadioRef : undefined}
                type="radio"
                name="checkout-wallet-radio"
                value={wallet.id}
                checked={checked}
                onChange={() => onWalletChange(wallet.id)}
                className="size-4 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span className="flex flex-col">
                <span className="font-bold">{wallet.label}</span>
                <span className="text-caption text-secondary-text">
                  {truncateAddress(wallet.address)} · {wallet.network}
                </span>
              </span>
              {checked && (
                <span className="ml-auto text-caption font-bold text-accent-text" aria-hidden="true">
                  ✓
                </span>
              )}
            </label>
          );
        })}
      </fieldset>

      <div className="flex flex-col gap-2">
        <p aria-live="polite" role="status" className="sr-only">
          {connectionNotice ?? ""}
        </p>
        {connection === "connected" ? (
          <div className="flex items-center justify-between gap-3 rounded-[3px] border border-primary px-4 py-3">
            <span className="text-body-lg font-bold text-foreground">Carteira conectada</span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onDisconnect}
                className="text-body-sm font-bold text-accent-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Desconectar
              </button>
              <button
                type="button"
                onClick={handleSwitchWallet}
                className="text-body-sm font-bold text-accent-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Trocar carteira
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onConnect}
              disabled={connection === "connecting" || !selectedWallet || !selectedNetwork}
              aria-busy={connection === "connecting"}
            >
              {connection === "connecting" ? "Conectando…" : "Conectar carteira"}
            </Button>
            <button
              type="button"
              onClick={onRefuseConnection}
              className="text-caption text-secondary-text underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Simular recusa de conexão
            </button>
            {connectionNotice === "Conexão recusada." && (
              <p className="text-caption text-destructive">Conexão recusada.</p>
            )}
          </div>
        )}
        <p className="text-caption text-secondary-text">
          METAMASK • WALLETCONNECT • COINBASE — apenas ilustrativo; a conexão é simulada nesta aplicação.
        </p>
      </div>
    </div>
  );
}
