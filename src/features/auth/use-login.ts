import { useMutation } from "@tanstack/react-query";
import type { LoginRequest, Session } from "@/contracts";
import { signIn } from "@/lib/auth/session";

/**
 * Mutation de login. Encaminha para `signIn` da camada de dados (que faz teardown incondicional →
 * grava a sessão no cache → reconecta o realtime — isolamento por usuário §11). `retry: 0`: um 401
 * é credencial inválida, não falha transitória. Navegação/toasts e mapeamento de erro ficam no
 * componente, que conhece o `redirect` e o formulário.
 */
export function useLogin() {
  return useMutation<Session, unknown, LoginRequest>({
    mutationFn: signIn,
    retry: 0,
  });
}
