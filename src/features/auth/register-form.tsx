import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { registerFormSchema, type RegisterFormValues } from "./schemas";
import { PasswordInput } from "./password-input";
import { applyAuthError } from "./apply-auth-error";
import { useRegister } from "./use-register";

/** Formulário de cadastro (spec §Cadastro). `confirmPassword` é validação só do cliente (A5); o
 *  corpo enviado é `RegisterRequest` (`displayName`/`email`/`password`). E-mail duplicado (409
 *  `registration`) vira erro no campo e-mail. */
export function RegisterForm({ onAuthenticated }: { onAuthenticated: () => void }) {
  const signUp = useRegister();
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { displayName: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit((values) => {
    clearErrors();
    // Corpo enviado = RegisterRequest (A5): `confirmPassword` fica fora.
    const body = {
      displayName: values.displayName,
      email: values.email,
      password: values.password,
    };
    signUp.mutate(body, {
      onSuccess: (session) => {
        toast.success(`Conta criada. Bem-vindo, ${session.user.displayName}!`);
        onAuthenticated();
      },
      onError: (error) =>
        applyAuthError<RegisterFormValues>(error, {
          mode: "register",
          setError,
          knownFields: ["displayName", "email", "password"],
        }),
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormField label="Nome de usuário" error={errors.displayName?.message}>
        {(field) => (
          <Input
            {...register("displayName")}
            id={field.id}
            autoComplete="username"
            placeholder="Nome de usuário"
            aria-describedby={field.describedBy}
            aria-invalid={field.invalid}
          />
        )}
      </FormField>

      <FormField label="E-mail" error={errors.email?.message}>
        {(field) => (
          <Input
            {...register("email")}
            id={field.id}
            type="email"
            autoComplete="email"
            placeholder="Digite seu e-mail"
            aria-describedby={field.describedBy}
            aria-invalid={field.invalid}
          />
        )}
      </FormField>

      <FormField label="Senha" error={errors.password?.message} hint="Mínimo de 8 caracteres.">
        {(field) => (
          <PasswordInput
            {...register("password")}
            id={field.id}
            autoComplete="new-password"
            placeholder="Crie uma senha"
            aria-describedby={field.describedBy}
            aria-invalid={field.invalid}
          />
        )}
      </FormField>

      <FormField label="Confirmar senha" error={errors.confirmPassword?.message}>
        {(field) => (
          <PasswordInput
            {...register("confirmPassword")}
            id={field.id}
            autoComplete="new-password"
            placeholder="Repita a senha"
            aria-describedby={field.describedBy}
            aria-invalid={field.invalid}
          />
        )}
      </FormField>

      {errors.root && (
        <p role="alert" className="text-caption text-destructive">
          {errors.root.message}
        </p>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={signUp.isPending}
        aria-busy={signUp.isPending}
      >
        {signUp.isPending ? "Criando conta…" : "Criar conta"}
      </Button>
    </form>
  );
}
