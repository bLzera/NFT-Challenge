import type { Wallet } from "@/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

interface WalletListProps {
  wallets: Wallet[];
  onEdit: (wallet: Wallet) => void;
}

/** Lista das carteiras já cadastradas (`listWallets`), com ação "Editar" por item. */
export function WalletList({ wallets, onEdit }: WalletListProps) {
  if (wallets.length === 0) return null;

  return (
    <ul className="flex flex-col gap-3">
      {wallets.map((wallet) => (
        <li
          key={wallet.id}
          data-testid={`wallet-item-${wallet.id}`}
          className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface-card px-4 py-3"
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-body-lg font-bold text-foreground">{wallet.label}</span>
              <Badge variant={wallet.role === "primary" ? "default" : "secondary"}>
                {wallet.role === "primary" ? "Principal" : "Secundária"}
              </Badge>
            </div>
            <span className="font-mono text-body-sm text-secondary-text">
              {truncateAddress(wallet.address)} · {wallet.network}
            </span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => onEdit(wallet)}>
            Editar
          </Button>
        </li>
      ))}
    </ul>
  );
}
