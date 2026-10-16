/** Carteiras (§5): consulta, cadastro e atualização. Exige auth. */
import { http } from "msw";
import { createWalletRequestSchema, updateWalletRequestSchema, walletIdSchema } from "@/contracts";
import { store } from "@/mock/store";
import { API, guarded, HttpResponse, parseBody, requireUser } from "./_helpers";

export const walletHandlers = [
  http.get(
    `${API}/wallets`,
    guarded("wallets.list", ({ request }) => {
      const userId = requireUser(request);
      return HttpResponse.json(store.listWallets(userId));
    }),
  ),

  http.post(
    `${API}/wallets`,
    guarded("wallets.create", async ({ request }) => {
      const userId = requireUser(request);
      const data = await parseBody(createWalletRequestSchema, request);
      return HttpResponse.json(store.createWallet(userId, data), { status: 201 });
    }),
  ),

  http.patch(
    `${API}/wallets/:walletId`,
    guarded("wallets.update", async ({ request, params }) => {
      const userId = requireUser(request);
      const walletId = walletIdSchema.parse(params.walletId);
      const patch = await parseBody(updateWalletRequestSchema, request);
      return HttpResponse.json(store.updateWallet(userId, walletId, patch));
    }),
  ),
];
