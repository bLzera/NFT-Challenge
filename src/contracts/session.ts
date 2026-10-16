import { z } from "zod";
import { isoDateTimeSchema, userIdSchema } from "./common";

/** Sessão e conta (ver contracts.spec.md § Sessão e conta). */

/** Usuário público — NUNCA inclui senha/hash. */
export const userSchema = z.object({
  id: userIdSchema,
  email: z.email(),
  displayName: z.string().min(1),
  avatarUrl: z.url().optional(),
  createdAt: isoDateTimeSchema,
});
export type User = z.infer<typeof userSchema>;

export const sessionSchema = z.object({
  user: userSchema,
  token: z.string().min(1),
  expiresAt: isoDateTimeSchema,
});
export type Session = z.infer<typeof sessionSchema>;

export const registerRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  displayName: z.string().min(1),
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

/** getSession retorna null quando não há sessão (decisão aprovada #3). */
export const sessionResponseSchema = sessionSchema.nullable();
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
