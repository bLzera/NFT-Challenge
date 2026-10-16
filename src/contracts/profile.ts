import { z } from "zod";
import { userIdSchema, versionSchema } from "./common";

/** Perfil (ver contracts.spec.md § Perfil). Requer auth. */

export const profileSchema = z.object({
  id: userIdSchema,
  displayName: z.string().min(1),
  email: z.email(),
  avatarUrl: z.url().optional(),
  bio: z.string().optional(),
  version: versionSchema,
});
export type Profile = z.infer<typeof profileSchema>;

export const updateProfileRequestSchema = z.object({
  displayName: z.string().min(1).optional(),
  bio: z.string().optional(),
  avatarUrl: z.url().optional(),
});
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;

/** Uploads reais estão fora de escopo (§1) → avatar por URL. */
export const updateAvatarRequestSchema = z.object({
  avatarUrl: z.url(),
});
export type UpdateAvatarRequest = z.infer<typeof updateAvatarRequestSchema>;

/** Senha atual incorreta → erro `validation` no campo `current` (decisão aprovada #4). */
export const changePasswordRequestSchema = z.object({
  current: z.string().min(1),
  next: z.string().min(8),
});
export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;
