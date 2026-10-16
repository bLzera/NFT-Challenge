import { z } from "zod";
import { nftIdSchema, versionSchema } from "./common";

/** Favoritos (ver contracts.spec.md § Favoritos). Requer auth; persistem por usuário. */

export const favoritesSchema = z.object({
  nftIds: z.array(nftIdSchema),
  version: versionSchema,
});
export type Favorites = z.infer<typeof favoritesSchema>;

export const toggleFavoriteRequestSchema = z.object({
  nftId: nftIdSchema,
});
export type ToggleFavoriteRequest = z.infer<typeof toggleFavoriteRequestSchema>;
