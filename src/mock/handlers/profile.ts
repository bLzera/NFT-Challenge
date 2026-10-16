/** Perfil (§5): consulta, atualização de dados/avatar e alteração de senha. Exige auth. */
import { http } from "msw";
import {
  changePasswordRequestSchema,
  updateAvatarRequestSchema,
  updateProfileRequestSchema,
} from "@/contracts";
import { store } from "@/mock/store";
import { API, guarded, HttpResponse, parseBody, requireUser } from "./_helpers";

export const profileHandlers = [
  http.get(
    `${API}/profile`,
    guarded("profile.get", ({ request }) => {
      const userId = requireUser(request);
      return HttpResponse.json(store.getProfile(userId));
    }),
  ),

  http.patch(
    `${API}/profile`,
    guarded("profile.update", async ({ request }) => {
      const userId = requireUser(request);
      const patch = await parseBody(updateProfileRequestSchema, request);
      return HttpResponse.json(store.updateProfile(userId, patch));
    }),
  ),

  http.put(
    `${API}/profile/avatar`,
    guarded("profile.avatar", async ({ request }) => {
      const userId = requireUser(request);
      const { avatarUrl } = await parseBody(updateAvatarRequestSchema, request);
      return HttpResponse.json(store.updateProfile(userId, { avatarUrl }));
    }),
  ),

  http.post(
    `${API}/profile/password`,
    guarded("profile.password", async ({ request }) => {
      const userId = requireUser(request);
      const { current, next } = await parseBody(changePasswordRequestSchema, request);
      store.changePassword(userId, current, next);
      return new HttpResponse(null, { status: 204 });
    }),
  ),
];
