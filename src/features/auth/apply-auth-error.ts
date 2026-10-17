import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { HttpError, type ApiRequestError } from "@/lib/http/errors";

/**
 * Traduz uma falha das mutations de auth (`signIn`/`signUp`, que rejeitam com `HttpError`) em erros
 * de formulário do react-hook-form (spec §Validação e mapeamento de erros). **Nunca fabrica dado**
 * (eliminatório §11): só descreve a falha. Erros sem campo específico vão para `root` (nível do
 * formulário, com `role="alert"`); 400 `validation` é distribuído pelos campos conhecidos.
 */
export interface ApplyAuthErrorOptions<T extends FieldValues> {
  mode: "login" | "register";
  setError: UseFormSetError<T>;
  /** Campos do formulário elegíveis a receber erro de validação do servidor. */
  knownFields: Path<T>[];
}

const ROOT = "root" as const;

export function applyAuthError<T extends FieldValues>(
  error: unknown,
  { mode, setError, knownFields }: ApplyAuthErrorOptions<T>,
): void {
  const root = (message: string) => setError(ROOT as Path<T>, { type: "server", message });

  if (!(error instanceof HttpError)) {
    root("Algo deu errado. Tente novamente.");
    return;
  }

  const detail: ApiRequestError = error.detail;

  if (detail.kind === "network") {
    root("Não foi possível conectar. Verifique sua internet e tente novamente.");
    return;
  }

  switch (detail.error.code) {
    case "unauthenticated":
      // No login, 401 = credencial inválida → erro no formulário (NÃO dispara expiração de sessão).
      root(mode === "login" ? "E-mail ou senha inválidos." : detail.error.message);
      return;

    case "conflict":
      if (detail.error.reason === "registration" && knownFields.includes("email" as Path<T>)) {
        setError("email" as Path<T>, {
          type: "server",
          message: "Este e-mail já está cadastrado.",
        });
        return;
      }
      root(detail.error.message);
      return;

    case "validation": {
      let distributed = false;
      for (const [field, messages] of Object.entries(detail.error.fields)) {
        const path = field as Path<T>;
        if (knownFields.includes(path) && messages[0]) {
          setError(path, { type: "server", message: messages[0] });
          distributed = true;
        }
      }
      if (!distributed) root(detail.error.message);
      return;
    }

    case "transient":
      root("Falha temporária. Tente novamente em instantes.");
      return;

    default:
      root(detail.error.message);
  }
}
