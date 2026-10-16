/** Cotação (§5/§7): valida cupom, recalcula totais; é a referência p/ finalizar o pedido. */
import { http } from "msw";
import { createQuoteRequestSchema } from "@/contracts";
import { store } from "@/mock/store";
import { API, guarded, HttpResponse, parseBody, requireUser } from "./_helpers";

export const quoteHandlers = [
  http.post(
    `${API}/quote`,
    guarded("quote.create", async ({ request }) => {
      const userId = requireUser(request);
      const body = await parseBody(createQuoteRequestSchema, request);
      return HttpResponse.json(store.createQuote(userId, body));
    }),
  ),
];
