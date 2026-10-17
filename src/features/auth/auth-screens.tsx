import { useCallback } from "react";
import { useRouter, useSearch } from "@tanstack/react-router";
import { AuthDialog } from "./auth-dialog";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";
import { safeInternalPath } from "./guard";

/**
 * Componentes das rotas `/login` e `/register` (substituem os placeholders da foundation). Leem o
 * `redirect` do search, calculam o destino **interno seguro** (`safeInternalPath`, anti open-redirect)
 * e o usam tanto no fechamento do modal quanto no retorno pós-autenticação. A navegação usa
 * `router.history.push` por aceitar um caminho dinâmico (o `redirect` é arbitrário, não uma rota
 * literal tipada).
 */
function useReturnNavigation(): { redirect: string | undefined; goBack: () => void } {
  const router = useRouter();
  const { redirect } = useSearch({ strict: false }) as { redirect?: string };
  const goBack = useCallback(() => {
    router.history.push(safeInternalPath(redirect));
  }, [router, redirect]);
  return { redirect, goBack };
}

export function LoginScreen() {
  const { redirect, goBack } = useReturnNavigation();
  return (
    <AuthDialog mode="login" redirect={redirect} onClose={goBack}>
      <LoginForm onAuthenticated={goBack} />
    </AuthDialog>
  );
}

export function RegisterScreen() {
  const { redirect, goBack } = useReturnNavigation();
  return (
    <AuthDialog mode="register" redirect={redirect} onClose={goBack}>
      <RegisterForm onAuthenticated={goBack} />
    </AuthDialog>
  );
}
