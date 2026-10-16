import { z } from "zod";
import { versionSchema, walletIdSchema } from "./common";

/** Carteiras (ver contracts.spec.md § Carteiras). Requer auth. */

export const walletRoleSchema = z.enum(["primary", "secondary"]);
export type WalletRole = z.infer<typeof walletRoleSchema>;

export const walletSchema = z.object({
  id: walletIdSchema,
  label: z.string().min(1),
  address: z.string().min(1),
  network: z.string().min(1),
  role: walletRoleSchema,
  version: versionSchema,
});
export type Wallet = z.infer<typeof walletSchema>;

export const createWalletRequestSchema = z.object({
  label: z.string().min(1),
  address: z.string().min(1),
  network: z.string().min(1),
  role: walletRoleSchema,
});
export type CreateWalletRequest = z.infer<typeof createWalletRequestSchema>;

export const updateWalletRequestSchema = createWalletRequestSchema.partial();
export type UpdateWalletRequest = z.infer<typeof updateWalletRequestSchema>;
