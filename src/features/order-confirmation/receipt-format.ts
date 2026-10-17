import type { Order } from "@/contracts";

/**
 * Formatadores puros do recibo (A3/A6). Todos derivam do snapshot `Order` — nunca fabricam dado
 * (§11). Extraídos da tela para serem testáveis isoladamente.
 */

/** Trunca o endereço no estilo `0xA91F…E82C` (replicado localmente, sem importar do checkout). */
export function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** `txRef` truncado — nunca fabricado; "—" enquanto ausente (pedido ainda não terminal). */
export function formatTxRef(txRef: string | undefined): string {
  if (!txRef) return "—";
  return truncateAddress(txRef);
}

/** Carteira do pedido: rede + endereço truncado — o `Order` não guarda label (A3; nunca "MetaMask"). */
export function formatWallet(wallet: Order["wallet"]): string {
  return `${wallet.network} · ${truncateAddress(wallet.address)}`;
}

/** Data do pedido; fallback para a string original se vier corrompida (nunca "Invalid Date"). */
export function formatOrderDate(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return createdAt;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

/** Sufixo numérico do `nftId` (`nft-001` → `001`) para o rótulo "ID do token: #…". */
export function tokenIdSuffix(nftId: string): string {
  return nftId.replace(/^nft-/, "");
}
