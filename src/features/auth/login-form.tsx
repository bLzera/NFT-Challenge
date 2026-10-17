import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loginFormSchema, type LoginFormValues } from "./schemas";
import { PasswordInput } from "./password-input";
import { ForgotPasswordLink } from "./social-section";
import { applyAuthError } from "./apply-auth-error";
import { useLogin } from "./use-login";

/** Formulário de login (spec §Login). Valida com `loginFormSchema` (Zod/contrato) e autentica via
 *  `useLogin`; sucesso → toast + `onAuthenticated` (retorno ao `redirect`). Erros da API viram erros
 *  de formulário (§Validação), sem fabricar dado. */
export function LoginForm({ onAuthenticated }: { onAuthenticated: () => void }) {
  const login = useLogin();
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit((values) => {
    clearErrors();
    login.mutate(values, {
      onSuccess: (session) => {
        toast.success(`Bem-vindo de volta, ${session.user.displayName}!`);
        onAuthenticated();
      },
      onError: (error) =>
        applyAuthError<LoginFormValues>(error, {
          mode: "login",
          setError,
          knownFields: ["email", "password"],
        }),
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormField label="E-mail" error={errors.email?.message}>
        {(field) => (
          <Input
            {...register("email")}
            id={field.id}
            type="email"
            autoComplete="email"
            placeholder="contato@email.com"
            aria-describedby={field.describedBy}
            aria-invalid={field.invalid}
          />
        )}
      </FormField>

      <FormField label="Senha" error={errors.password?.message}>
        {(field) => (
          <PasswordInput
            {...register("password")}
            id={field.id}
            autoComplete="current-password"
            placeholder="Sua senha"
            aria-describedby={field.describedBy}
            aria-invalid={field.invalid}
          />
        )}
      </FormField>

      <ForgotPasswordLink />

      {errors.root && (
        <p role="alert" className="text-caption text-destructive">
          {errors.root.message}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={login.isPending} aria-busy={login.isPending}>
        {login.isPending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
