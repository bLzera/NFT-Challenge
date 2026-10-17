import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { HttpError, type ApiRequestError } from "@/lib/http/errors";

/**
 * Mapeamento erro de API → campo de formulário, genérico sobre `HttpError.detail` (A4 da spec
 * `account`). Reusa o padrão de `applyAuthError` (`src/features/auth/apply-auth-error.ts`) sem
 * importar dali — evita acoplamento feature↔feature. **Nunca fabrica dado** (eliminatório §11): só
 * descreve a falha. `validation` (400) distribui por `error.fields`; o resto (`conflict`/
 * `transient`/`network`/`forbidden`/sobra) vai para `root` (`role="alert"`).
 */
export interface ApplyFieldErrorsOptions<T extends FieldValues> {
  setError: UseFormSetError<T>;
  /** Campos do formulário elegíveis a receber erro de validação do servidor. */
  knownFields: Path<T>[];
  /**
   * Mapeamento opcional de um `(code, status|reason)` específico para uma mensagem + campo
   * customizados — ex.: "senha atual incorreta" → campo `current` (profile spec, tabela de erros).
   * Se retornar `undefined`, cai no tratamento genérico abaixo.
   */
  mapKnown?: (detail: ApiRequestError) => { field: Path<T> | "root"; message: string } | undefined;
}

const ROOT = "root" as const;

export function applyFieldErrors<T extends FieldValues>(
  error: unknown,
  { setError, knownFields, mapKnown }: ApplyFieldErrorsOptions<T>,
): void {
  const root = (message: string) => setError(ROOT as Path<T>, { type: "server", message });

  if (!(error instanceof HttpError)) {
    root("Algo deu errado. Tente novamente.");
    return;
  }

  const detail: ApiRequestError = error.detail;

  const known = mapKnown?.(detail);
  if (known) {
    setError(known.field === "root" ? (ROOT as Path<T>) : known.field, {
      type: "server",
      message: known.message,
    });
    return;
  }

  if (detail.kind === "network") {
    root("Não foi possível conectar. Verifique sua internet e tente novamente.");
    return;
  }

  switch (detail.error.code) {
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

    case "conflict":
      root(detail.error.message);
      return;

    case "forbidden":
      root(detail.error.message);
      return;

    default:
      root(detail.error.message);
  }
}
