import { z } from "zod";
import { createWalletRequestSchema, walletRoleSchema } from "@/contracts";

/**
 * Schema do form de carteira (cadastro/edição, A-wallets-4 da spec `account`). Deriva de
 * `createWalletRequestSchema` via `.extend`, só relocalizando mensagens pt-BR. `network`/`role` usam
 * `<select>` — sem free-text (A-wallets-2).
 */
export const walletFormSchema = createWalletRequestSchema.extend({
  label: z.string().min(1, "Informe um nome de exibição."),
  address: z.string().min(1, "Informe o endereço da carteira."),
  network: z.string().min(1, "Selecione uma rede."),
  role: walletRoleSchema,
});
export type WalletFormValues = z.infer<typeof walletFormSchema>;

/**
 * Conjunto de redes suportadas pelo cadastro (A-wallets-2): não há endpoint que liste redes —
 * `network` é string livre no contrato. Conjunto fixo derivado das fixtures do mock
 * (`src/mock/fixtures/users.ts`: `ethereum`, `polygon`), unido às redes já presentes nas carteiras
 * do usuário para nunca perder uma existente (ex.: um valor legado fora do conjunto conhecido).
 * Pura e testável.
 */
export const KNOWN_NETWORKS = ["ethereum", "polygon"] as const;

export function availableNetworks(existingNetworks: readonly string[]): string[] {
  return Array.from(new Set([...KNOWN_NETWORKS, ...existingNetworks]));
}
