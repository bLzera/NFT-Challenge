/** Sessão e conta (§5). Cadastro/login emitem sessão e mesclam o carrinho de visitante (#5). */
import { http } from "msw";
import { loginRequestSchema, registerRequestSchema } from "@/contracts";
import { errors } from "@/mock/http-error";
import { store } from "@/mock/store";
import { currentScenario } from "@/mock/scenarios/apply";
import { API, bearer, guarded, HttpResponse, parseBody } from "./_helpers";

export const sessionHandlers = [
  http.post(
    `${API}/auth/register`,
    guarded("auth.register", async ({ request }) => {
      const body = await parseBody(registerRequestSchema, request);
      if (currentScenario().forceRegisterConflict) {
        throw errors.conflict("registration", "E-mail já cadastrado.");
      }
      const session = store.register(body);
      store.mergeGuestCartInto(session.user.id);
      return HttpResponse.json(session, { status: 201 });
    }),
  ),

  http.post(
    `${API}/auth/login`,
    guarded("auth.login", async ({ request }) => {
      const body = await parseBody(loginRequestSchema, request);
      const session = store.login(body);
      store.mergeGuestCartInto(session.user.id);
      return HttpResponse.json(session);
    }),
  ),

  http.get(
    `${API}/auth/session`,
    guarded("auth.session", ({ request }) => {
      return HttpResponse.json(store.getSession(bearer(request)));
    }),
  ),

  http.post(
    `${API}/auth/logout`,
    guarded("auth.logout", ({ request }) => {
      store.logout(bearer(request));
      return new HttpResponse(null, { status: 204 });
    }),
  ),
];
