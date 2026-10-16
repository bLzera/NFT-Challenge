/**
 * Carrinho (§5). Funciona para visitante (ownerKey `guest`) e autenticado (ownerKey = userId);
 * ao autenticar, o carrinho de visitante é mesclado (handlers de sessão). Respeita disponibilidade.
 */
import { http } from "msw";
import {
  addCartItemRequestSchema,
  removeCartItemRequestSchema,
  updateCartItemRequestSchema,
} from "@/contracts";
import { store } from "@/mock/store";
import { GUEST_OWNER_KEY } from "@/mock/db/types";
import { API, bearer, guarded, HttpResponse, parseBody } from "./_helpers";

/** Dono do carrinho: usuário autenticado, ou visitante quando não há sessão. */
function ownerKey(request: Request): string {
  return store.resolveUser(bearer(request)) ?? GUEST_OWNER_KEY;
}

export const cartHandlers = [
  http.get(
    `${API}/cart`,
    guarded("cart.get", ({ request }) => {
      return HttpResponse.json(store.getCart(ownerKey(request)));
    }),
  ),

  http.post(
    `${API}/cart/items`,
    guarded("cart.add", async ({ request }) => {
      const body = await parseBody(addCartItemRequestSchema, request);
      return HttpResponse.json(store.addCartItem(ownerKey(request), body));
    }),
  ),

  http.patch(
    `${API}/cart/items`,
    guarded("cart.update", async ({ request }) => {
      const body = await parseBody(updateCartItemRequestSchema, request);
      return HttpResponse.json(store.updateCartItem(ownerKey(request), body));
    }),
  ),

  http.delete(
    `${API}/cart/items`,
    guarded("cart.remove", async ({ request }) => {
      const { nftId } = await parseBody(removeCartItemRequestSchema, request);
      return HttpResponse.json(store.removeCartItem(ownerKey(request), nftId));
    }),
  ),
];
