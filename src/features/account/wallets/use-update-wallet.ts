import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateWalletRequest, Wallet, WalletId } from "@/contracts";
import { updateWallet } from "@/lib/http/api";
import { keys } from "@/lib/query/keys";

interface UpdateWalletInput {
  walletId: WalletId;
  body: UpdateWalletRequest;
}

/** Mutation de edição de carteira — mesma reconciliação por invalidação (A-wallets-1). */
export function useUpdateWallet() {
  const queryClient = useQueryClient();
  return useMutation<Wallet, unknown, UpdateWalletInput>({
    mutationFn: ({ walletId, body }) => updateWallet(walletId, body),
    retry: 0,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.wallets });
    },
  });
}
