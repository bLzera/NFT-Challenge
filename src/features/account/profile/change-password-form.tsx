import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { ChangePasswordRequest } from "@/contracts";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/features/auth/password-input";
import { applyFieldErrors } from "../apply-field-errors";
import { changePasswordFormSchema, type ChangePasswordFormValues } from "./profile-schemas";
import { useChangePassword } from "./use-change-password";

/**
 * Form "Alterar senha" (A-profile-1): `current`/`next` via `changePassword`; `confirmNext` só
 * cliente. "Senha atual incorreta" → `validation` no campo `current` (tabela de erros da spec). Em
 * sucesso, limpa os campos de senha.
 */
export function ChangePasswordForm() {
  const changePassword = useChangePassword();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: { current: "", next: "", confirmNext: "" },
  });

  const onSubmit = handleSubmit((values) => {
    clearErrors();
    const body: ChangePasswordRequest = { current: values.current, next: values.next };
    changePassword.mutate(body, {
      onSuccess: () => {
        toast.success("Senha alterada.");
        reset({ current: "", next: "", confirmNext: "" });
      },
      onError: (error) =>
        applyFieldErrors<ChangePasswordFormValues>(error, {
          setError,
          knownFields: ["current", "next"],
          mapKnown: (detail) => {
            // Tabela de erros do perfil: "senha atual incorreta" → `validation`, campo `current`.
            if (detail.kind === "api" && detail.error.code === "validation" && detail.error.fields.current) {
              return { field: "current", message: detail.error.fields.current[0] ?? "Senha atual incorreta." };
            }
            return undefined;
          },
        }),
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <h2 className="text-body-lg font-medium text-foreground">Alterar senha</h2>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <FormField label="Senha atual" required error={errors.current?.message}>
          {(field) => (
            <PasswordInput
              {...register("current")}
              id={field.id}
              autoComplete="current-password"
              placeholder="Sua senha atual"
              aria-describedby={field.describedBy}
              aria-invalid={field.invalid}
              aria-required="true"
            />
          )}
        </FormField>

        <FormField label="Nova senha" required error={errors.next?.message} hint="Mínimo de 8 caracteres.">
          {(field) => (
            <PasswordInput
              {...register("next")}
              id={field.id}
              autoComplete="new-password"
              placeholder="Nova senha"
              aria-describedby={field.describedBy}
              aria-invalid={field.invalid}
              aria-required="true"
            />
          )}
        </FormField>

        <FormField label="Confirmar nova senha" required error={errors.confirmNext?.message}>
          {(field) => (
            <PasswordInput
              {...register("confirmNext")}
              id={field.id}
              autoComplete="new-password"
              placeholder="Repita a nova senha"
              aria-describedby={field.describedBy}
              aria-invalid={field.invalid}
              aria-required="true"
            />
          )}
        </FormField>
      </div>

      {errors.root && (
        <p role="alert" className="text-caption text-destructive">
          {errors.root.message}
        </p>
      )}

      <Button
        type="submit"
        disabled={changePassword.isPending}
        aria-busy={changePassword.isPending}
        className="w-fit"
      >
        {changePassword.isPending ? "Alterando…" : "Alterar senha"}
      </Button>
    </form>
  );
}
