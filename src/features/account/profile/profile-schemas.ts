import { z } from "zod";
import { changePasswordRequestSchema, updateProfileRequestSchema } from "@/contracts";

/**
 * Schemas dos formulários de perfil/senha (A3 da spec `account`). Derivam dos schemas de contrato
 * via `.extend`, só relocalizando mensagens pt-BR; `changePasswordFormSchema` acrescenta
 * `confirmNext` — validação **só do cliente** (não vai no corpo da API).
 */

export const profileFormSchema = updateProfileRequestSchema.extend({
  displayName: z.string().min(1, "Informe um nome de exibição.").optional(),
  bio: z.string().optional(),
  avatarUrl: z.union([z.literal(""), z.string().url("URL inválida.")]).optional(),
});
export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const changePasswordFormSchema = changePasswordRequestSchema
  .extend({
    current: z.string().min(1, "Informe sua senha atual."),
    next: z.string().min(8, "A nova senha deve ter ao menos 8 caracteres."),
    // Só no cliente — não vai no corpo da API.
    confirmNext: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((data) => data.next === data.confirmNext, {
    message: "As senhas não coincidem.",
    path: ["confirmNext"],
  });
export type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;
