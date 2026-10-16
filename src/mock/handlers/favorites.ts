/** Favoritos (§5): consulta e toggle; exigem auth, persistem por usuário. */
import { http } from "msw";
import { toggleFavoriteRequestSchema } from "@/contracts";
import { store } from "@/mock/store";
import { API, guarded, HttpResponse, parseBody, requireUser } from "./_helpers";

export const favoriteHandlers = [
  http.get(
    `${API}/favorites`,
    guarded("favorites.get", ({ request }) => {
      const userId = requireUser(request);
      return HttpResponse.json(store.getFavorites(userId));
    }),
  ),

  http.post(
    `${API}/favorites`,
    guarded("favorites.toggle", async ({ request }) => {
      const userId = requireUser(request);
      const { nftId } = await parseBody(toggleFavoriteRequestSchema, request);
      return HttpResponse.json(store.toggleFavorite(userId, nftId));
    }),
  ),
];
