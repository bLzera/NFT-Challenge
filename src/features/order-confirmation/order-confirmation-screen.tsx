import { useEffect, useRef } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import type { Order, OrderId, OrderItem } from "@/contracts";
import { formatEth } from "@/contracts";
import { isApiCode } from "@/lib/http/errors";
import { EmptyState, ErrorState, LoadingState, isRetryable, resolveApiRequestError } from "@/components/state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatOrderDate, formatTxRef, formatWallet, tokenIdSuffix } from "./receipt-format";
import { useOrderConfirmation } from "./use-order-confirmation";

/**
 * Tela de confirmação de pedido (`/order/$orderId`, A1/A2). Troca o `component` do placeholder
 * privado registrado pela `checkout`. Renderizada como página dedicada (não modal sobreposto — ver
 * ARCHITECTURE.md): recibo é snapshot imutável do `Order` (A3), ciclo de vida refletido por
 * `order.status` (A4) lendo só `keys.order.detail` via `useOrderConfirmation`.
 */
export function OrderConfirmationScreen() {
  // `OrderId` é só marca de tipo (branded `string`, sem formato) — o path param nunca é vazio, então
  // basta o cast; a existência real do pedido é validada pelo servidor (`getOrder` → not_found).
  const { orderId } = useParams({ from: "/order/$orderId" }) as { orderId: OrderId };
  const query = useOrderConfirmation(orderId);

  if (query.isPending) {
    return <OrderConfirmationSkeleton />;
  }

  if (query.isError) {
    const detail = resolveApiRequestError(query.error);

    if (isApiCode(detail, "not_found")) {
      return (
        <EmptyState
          title="Pedido não encontrado"
          description="Não encontramos este pedido, ou ele pertence a outra conta."
          action={
            <Button asChild>
              <Link to="/">Voltar ao início</Link>
            </Button>
          }
        />
      );
    }

    if (isApiCode(detail, "forbidden")) {
      return (
        <ErrorState
          error={query.error}
          title="Sem acesso a este pedido"
          className="[&_p]:text-center"
        />
      );
    }

    return (
      <ErrorState
        error={query.error}
        title="Não foi possível carregar o pedido"
        onRetry={() => query.refetch()}
        retryable={isRetryable(detail)}
      />
    );
  }

  const order = query.data;

  if (order.status === "pending") {
    return <PendingPanel order={order} />;
  }

  if (order.status === "declined") {
    return <DeclinedPanel />;
  }

  return <ConfirmedReceipt order={order} />;
}

function OrderConfirmationSkeleton() {
  return (
    <LoadingState label="Carregando pedido…" className="mx-auto w-full max-w-[578px]">
      <div className="flex flex-col gap-6 rounded-md bg-surface-card p-6">
        <div className="flex flex-col items-center gap-3 py-4">
          <Skeleton className="size-12 rounded-full" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        <Skeleton className="h-4 w-48" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[70px] w-full" />
          ))}
        </div>
        <Skeleton className="h-16 w-full" />
      </div>
    </LoadingState>
  );
}

/* ── `pending`: aguardando socket (A4) ─────────────────────────────────── */

function PendingPanel({ order }: { order: Order }) {
  return (
    <div className="mx-auto flex w-full max-w-[578px] flex-col gap-6 rounded-md bg-surface-card p-6 sm:p-10">
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="flex flex-col items-center gap-3 py-4 text-center"
      >
        <Loader2 className="size-10 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
        <p className="text-body-lg font-bold text-foreground">Confirmando o pagamento…</p>
        <p className="text-body-sm text-secondary-text">
          Isso pode levar alguns instantes. Não feche esta página.
        </p>
      </div>

      <OrderItemsList items={order.items} />

      <TotalsBlock order={order} />
    </div>
  );
}

/* ── `declined`: estado derivado da foundation (A9) ─────────────────────── */

function DeclinedPanel() {
  // M1: foco no próprio container `role="alert"` (não num filho) — focar um elemento aninhado
  // enquanto o live region anuncia causa leitura dupla/engasgo em leitores de tela.
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    alertRef.current?.focus();
  }, []);

  return (
    <div
      ref={alertRef}
      role="alert"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-[578px] flex-col items-center gap-4 rounded-md border border-destructive/50 bg-surface-card px-6 py-12 text-center outline-none"
    >
      <XCircle className="size-10 text-destructive" aria-hidden="true" />
      <h1 className="text-heading-sm font-bold text-foreground">Pagamento recusado</h1>
      <p className="text-body-sm text-secondary-text">
        O pagamento não foi concluído. Nenhum valor foi cobrado.
      </p>
      <Button asChild>
        <Link to="/cart">Tentar novamente</Link>
      </Button>
    </div>
  );
}

/* ── `confirmed`: recibo completo (Figma — Order Confirmation Modal) ────── */

function ConfirmedReceipt({ order }: { order: Order }) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-[578px] flex-col bg-surface-card">
      {/* Modal Header */}
      <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
        <CheckCircle2 className="size-12 text-primary" aria-hidden="true" />
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-body-lg font-bold text-secondary-text outline-none"
        >
          Seus NFTs agora estão na sua carteira
        </h1>
      </div>

      <div className="h-px w-full bg-primary" aria-hidden="true" />

      {/* Transaction Meta */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 px-6 py-4 sm:grid-cols-4 sm:px-9">
        <MetaItem label="ID da transação" value={formatTxRef(order.txRef)} />
        <MetaItem label="Data" value={formatOrderDate(order.createdAt)} />
        <MetaItem label="Total" value={`${formatEth(order.totalEth)} ETH`} />
        <MetaItem label="Carteira" value={formatWallet(order.wallet)} />
      </dl>

      <div className="h-px w-full bg-primary" aria-hidden="true" />

      {/* Transaction Details */}
      <div className="flex flex-col gap-3 px-6 py-5 sm:px-11 sm:pb-12">
        <h2 className="text-body font-bold text-foreground">Detalhes da transação</h2>

        <div
          role="row"
          className="flex items-center justify-between border-b border-primary/30 pb-3 text-body-lg font-bold text-foreground"
        >
          <span role="columnheader">NFTs</span>
          <div className="flex items-center gap-12">
            <span role="columnheader">Edições</span>
            <span role="columnheader" className="font-medium">
              Subtotal
            </span>
          </div>
        </div>

        <OrderItemsList items={order.items} />

        <div className="h-px w-full bg-primary/30" aria-hidden="true" />

        <TotalsBlock order={order} />

        <div className="h-px w-full bg-primary/30" aria-hidden="true" />

        {/* Footer Note */}
        <div className="flex flex-col items-center gap-6 pt-6 text-center">
          <p className="text-body-sm text-secondary-text">
            Transação confirmada na Ethereum. A propriedade foi transferida para sua carteira
            conectada.
          </p>
          <button
            type="button"
            disabled
            title="Referência simulada — não navega para um explorador real"
            className="rounded-[5px] bg-primary px-4 py-3 text-body-lg font-bold text-primary-foreground cursor-not-allowed opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed"
          >
            Ver no Etherscan
          </button>
          <p className="text-caption text-secondary-text">
            (Referência de transação simulada — não leva a um explorador real.)
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 px-6 pb-8 sm:flex-row sm:justify-center">
        <Button asChild variant="outline">
          <Link to="/">Continuar comprando</Link>
        </Button>
        <Button asChild>
          <Link to="/">Ver meus pedidos</Link>
        </Button>
      </div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-body-sm font-bold text-secondary-text">{label}</dt>
      <dd className="text-body-sm text-secondary-text">{value}</dd>
    </div>
  );
}

function OrderItemsList({ items }: { items: OrderItem[] }) {
  return (
    <ul className="flex flex-col gap-3" aria-label="Itens do pedido">
      {items.map((item) => (
        <li
          key={item.nftId}
          className="flex items-center gap-3 rounded-md bg-surface-card px-2 py-1"
        >
          <img
            src={item.imageUrl}
            alt={item.title}
            className="size-[70px] shrink-0 rounded-md object-cover"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="truncate text-body-lg font-bold text-foreground">{item.title}</span>
            <span className="text-body-sm text-secondary-text">
              ID do token: #{tokenIdSuffix(item.nftId)}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-5">
            <span className="text-body-sm text-secondary-text">(x {item.quantity})</span>
            <span className="text-body-lg font-bold text-accent-text">
              {formatEth(item.lineTotalEth)} ETH
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function TotalsBlock({ order }: { order: Order }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-body-sm text-foreground">Taxa de rede</span>
        <span className="text-body-lg text-foreground">{formatEth(order.networkFeeEth)} ETH</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-body-lg font-bold text-foreground">Total</span>
        <span className="text-body-lg font-bold text-accent-text">
          {formatEth(order.totalEth)} ETH
        </span>
      </div>
    </div>
  );
}

