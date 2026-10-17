import { useId, type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldRenderProps {
  /** Ligar no controle: `id`. */
  id: string;
  /** Ligar no controle: `aria-describedby` (hint e/ou erro). */
  describedBy: string | undefined;
  /** Ligar no controle: `aria-invalid`. */
  invalid: boolean;
}

interface FormFieldProps {
  label: string;
  /** Mensagem de erro (ex.: do resolver na feature). Presente → campo inválido + anúncio. */
  error?: string;
  /** Texto auxiliar opcional, abaixo do label. */
  hint?: string;
  required?: boolean;
  className?: string;
  /**
   * Render-prop: recebe os ids/flags de a11y já calculados para ligar no controle (Input, select,
   * etc.). Mantém o `FormField` agnóstico de biblioteca de formulário — a feature pluga
   * react-hook-form/zod no controle interno.
   */
  children: (field: FormFieldRenderProps) => ReactNode;
}

/**
 * Campo de formulário acessível (§8): associa label↔controle (`htmlFor`/`id`), anuncia erro
 * (`role="alert"`) e liga `aria-describedby`/`aria-invalid`. Usado por auth, perfil, senha, carteiras.
 */
export function FormField({ label, error, hint, required, className, children }: FormFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {hint && (
        <p id={hintId} className="text-caption text-muted-foreground">
          {hint}
        </p>
      )}
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error && (
        <p id={errorId} role="alert" className="text-caption text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
