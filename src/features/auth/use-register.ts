import { useMutation } from "@tanstack/react-query";
import type { RegisterRequest, Session } from "@/contracts";
import { signUp } from "@/lib/auth/session";

/**
 * Mutation de cadastro. Encaminha para `signUp` (cria a conta, autentica e adota a sessão com o
 * mesmo teardown do login). `retry: 0`: um 409 (e-mail já cadastrado) não deve ser reenviado. O
 * corpo é exatamente `RegisterRequest` — `confirmPassword` fica no cliente (A5).
 */
export function useRegister() {
  return useMutation<Session, unknown, RegisterRequest>({
    mutationFn: signUp,
    retry: 0,
  });
}
