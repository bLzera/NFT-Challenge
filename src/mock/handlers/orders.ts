/**
 * Pedidos (§5/§7): criação idempotente e consulta de estado/recibo.
 *
 * Cenário `order-timeout`: a 1ª criação persiste o pedido (e agenda sua resolução), mas a resposta
 * sofre timeout (falha de conexão). O retry com a MESMA `idempotencyKey` recupera o pedido existente
 * (idempotência) — sem criar outra compra. A transição terminal chega por `order.updated` (socket).
 */
import { http } from "msw";
import { createOrderRequestSchema, getOrderParamsSchema } from "@/contracts";
import { store } from "@/mock/store";
import { currentScenario, NetworkError } from "@/mock/scenarios/apply";
import { API, guarded, HttpResponse, parseBody, requireUser } from "./_helpers";

export const orderHandlers = [
  http.post(
    `${API}/orders`,
    guarded("orders.create", async ({ request }) => {
      const userId = requireUser(request);
      const body = await parseBody(createOrderRequestSchema, request);
      const scenario = currentScenario();

      const { order, replayed } = store.createOrder(userId, body);

      // Agenda a resolução terminal apenas na criação original.
      if (!replayed && scenario.orderResolution) {
        store.resolveOrderLater(order.id, scenario.orderResolution);
      }

      // Timeout na 1ª tentativa: pedido já existe, mas o cliente não recebe resposta.
      if (scenario.orderTimeout && !replayed) {
        throw new NetworkError();
      }

      return HttpResponse.json(order, { status: replayed ? 200 : 201 });
    }),
  ),

  http.get(
    `${API}/orders/:orderId`,
    guarded("orders.get", ({ request, params }) => {
      const userId = requireUser(request);
      const { orderId } = getOrderParamsSchema.parse(params);
      return HttpResponse.json(store.getOrder(userId, orderId));
    }),
  ),
];
