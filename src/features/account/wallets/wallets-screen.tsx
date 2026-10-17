import { useState } from "react";
import type { Wallet } from "@/contracts";
import { useWallets } from "@/lib/wallets/use-wallets";
import { AccountLayout } from "../account-layout";
import { ErrorState, LoadingState, isRetryable, resolveApiRequestError } from "@/components/state";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { WalletList } from "./wallet-list";
import { WalletForm } from "./wallet-form";

/**
 * Tela `/wallets` (A1): lista (`listWallets`) + cadastro (`createWallet`) + edição (`updateWallet`).
 * É o destino do checkout sem carteira (A-wallets-3): ao voltar, `keys.wallets` já foi invalidado
 * pela mutação, então o checkout refaz o fetch e libera a seleção.
 */
export function WalletsScreen() {
  return (
    <AccountLayout active="wallets">
      <WalletsContent />
    </AccountLayout>
  );
}

function WalletsContent() {
  const query = useWallets(true);
  const [editingWallet, setEditingWallet] = useState<Wallet | undefined>(undefined);

  if (query.isPending) {
    return <WalletsSkeleton />;
  }

  if (query.isError) {
    return (
      <ErrorState
        error={query.error}
        title="Não foi possível carregar suas carteiras"
        onRetry={() => query.refetch()}
        retryable={isRetryable(resolveApiRequestError(query.error))}
      />
    );
  }

  const wallets = query.data;
  const existingNetworks = wallets.map((w) => w.network);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-body-lg font-bold text-foreground">Carteiras</h1>
        <p className="text-body-sm text-secondary-text">
          Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
        </p>
      </div>

      <WalletList wallets={wallets} onEdit={setEditingWallet} />

      <Separator className="bg-primary/20" />

      <div className="flex flex-col gap-2">
        <h2 className="text-body-lg font-bold text-foreground">
          {editingWallet ? "Editar carteira" : "Adicionar carteira"}
        </h2>
        <WalletForm
          key={editingWallet?.id ?? "new"}
          editingWallet={editingWallet}
          existingNetworks={existingNetworks}
          onDone={() => setEditingWallet(undefined)}
        />
      </div>
    </div>
  );
}

function WalletsSkeleton() {
  return (
    <LoadingState label="Carregando carteiras…">
      <div className="flex flex-col gap-8">
        <Skeleton className="h-4 w-56" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-[62px] w-full rounded-md" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[69px] w-full" />
          ))}
        </div>
      </div>
    </LoadingState>
  );
}
