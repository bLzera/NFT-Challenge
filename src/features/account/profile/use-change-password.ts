import { useMutation } from "@tanstack/react-query";
import type { ChangePasswordRequest } from "@/contracts";
import { changePassword } from "@/lib/http/api";

/**
 * Mutation "Alterar senha" (A-profile-1): `POST /profile/password`, retorna `void` — não há cache a
 * reconciliar. `retry: 0`: "senha atual incorreta" é erro de validação, não falha transitória.
 */
export function useChangePassword() {
  return useMutation<void, unknown, ChangePasswordRequest>({
    mutationFn: changePassword,
    retry: 0,
  });
}
