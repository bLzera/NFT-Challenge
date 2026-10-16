import { z } from "zod";
import { isoDateTimeSchema, versionSchema } from "./common";
import { ethAmountSchema, stockQuantitySchema } from "./value-types";

/**
 * Eventos Socket.IO (ver contracts.spec.md § Eventos). Envelope comum com identidade estável,
 * recurso afetado e `version` — permite dedupe/descarte de eventos antigos e isolamento por
 * usuário (§7). A lógica de aplicação vive na Fase 3; aqui são só os tipos.
 */

export const eventResourceTypeSchema = z.enum(["nft", "order"]);

/** Envelope genérico; `type` discrimina o nome do evento, `payload` é específico. */
function socketEventSchema<T extends string, P extends z.ZodTypeAny>(type: T, payload: P) {
  return z.object({
    id: z.string().min(1), // identidade estável do evento
    type: z.literal(type),
    resource: z.object({
      type: eventResourceTypeSchema,
      id: z.string().min(1),
    }),
    version: versionSchema,
    at: isoDateTimeSchema,
    payload,
  });
}

export const nftUpdatedEventSchema = socketEventSchema(
  "nft.updated",
  z
    .object({
      priceEth: ethAmountSchema.optional(),
      editionsAvailable: stockQuantitySchema.optional(),
    })
    // §7: o evento deve carregar o recurso afetado — ao menos um campo de estado.
    .refine((p) => p.priceEth !== undefined || p.editionsAvailable !== undefined, {
      message: "nft.updated deve carregar priceEth e/ou editionsAvailable",
    }),
);
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEventSchema>;

export const orderUpdatedEventSchema = socketEventSchema(
  "order.updated",
  z.object({
    status: z.enum(["confirmed", "declined"]),
    txRef: z.string().optional(),
  }),
);
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEventSchema>;

/** União de todos os eventos de servidor → cliente. */
export const socketEventSchemaUnion = z.discriminatedUnion("type", [
  nftUpdatedEventSchema,
  orderUpdatedEventSchema,
]);
export type SocketEvent = z.infer<typeof socketEventSchemaUnion>;

/** Mapa nome do evento → nome do canal Socket.IO (consumido na Fase 3). */
export const SOCKET_EVENT_NAMES = {
  nftUpdated: "nft.updated",
  orderUpdated: "order.updated",
} as const;
