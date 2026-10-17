import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateWalletRequest, Wallet } from "@/contracts";
import { createWallet } from "@/lib/http/api";
import { keys } from "@/lib/query/keys";

/**
 * Mutation de cadastro de carteira (A-wallets-1): reconciliação por **invalidação**, não otimista —
 * cadastro/edição não são interações de alta frequência e um estado otimista mal reconciliado
 * confundiria o usuário na lista usada pelo checkout.
 */
export function useCreateWallet() {
  const queryClient = useQueryClient();
  return useMutation<Wallet, unknown, CreateWalletRequest>({
    mutationFn: createWallet,
    retry: 0,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.wallets });
    },
  });
}
