import { useQuery } from "@tanstack/react-query";
import { listWallets } from "@/lib/http/api";
import { keys } from "@/lib/query/keys";

/**
 * Carteiras do usuário (A4): `GET /api/wallets` → `Wallet[]` real. Fonte da seleção de carteira/rede
 * no checkout — nunca fabricada. `enabled` por quem chama (autenticado), igual ao padrão de
 * `useFavoritesStatus`/`useCart`.
 */
export function useWallets(enabled: boolean) {
  return useQuery({
    queryKey: keys.wallets,
    queryFn: listWallets,
    enabled,
  });
}
