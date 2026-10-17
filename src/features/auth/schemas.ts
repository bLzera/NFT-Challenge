import { z } from "zod";
import { loginRequestSchema, registerRequestSchema } from "@/contracts";

/**
 * Schemas dos formulários de auth (decisões A4/A5 da spec). Derivam dos schemas de contrato
 * (`@/contracts`, fonte única das regras) via `.extend`, apenas **relocalizando** as mensagens para
 * pt-BR e, no cadastro, acrescentando `confirmPassword` — validação **só do cliente**. O corpo
 * enviado à API continua sendo exatamente `LoginRequest`/`RegisterRequest`.
 */

export const loginFormSchema = loginRequestSchema.extend({
  email: z.string().min(1, "Informe seu e-mail.").email("E-mail inválido."),
  password: z.string().min(1, "Informe sua senha."),
});
export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const registerFormSchema = registerRequestSchema
  .extend({
    displayName: z.string().min(1, "Informe um nome de usuário."),
    email: z.string().min(1, "Informe seu e-mail.").email("E-mail inválido."),
    password: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
    // A5: só no cliente — não vai no corpo da API.
    confirmPassword: z.string().min(1, "Confirme sua senha."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });
export type RegisterFormValues = z.infer<typeof registerFormSchema>;
