/**
 * Aplicação de eventos Socket.IO no cache (ver data.spec.md § lib/realtime · decisões #5/#7).
 *
 * O envelope (`@/contracts/events`) carrega `resource`, `version` e o estado afetado. Aqui a `version`
 * é a lei da ordem: guardamos a última aplicada por recurso e **descartamos eventos com `version`
 * menor ou igual** — idempotente e tolerante a duplicata/entrega fora de ordem (§7). Eventos válidos
 * e novos escrevem DIRETO no cache (sem refetch): preço/edições de um NFT refletem em detalhe, listas
 * e carrinho; status de um pedido reflete no seu recibo.
 */
import type { QueryClient } from "@tanstack/react-query";
import {
  nftUpdatedEventSchema,
  orderUpdatedEventSchema,
  type Cart,
  type Nft,
  type NftPage,
  type Order,
} from "@/contracts";
import { keys } from "@/lib/query/keys";

/** Última `version` aplicada por recurso (`"nft:<id>"` / `"order:<id>"`). */
const applied = new Map<string, number>();

/** Esquece o histórico de versões (teardown de usuário — evita vazamento entre sessões). */
export function clearVersions(): void {
  applied.clear();
}

/** `true` se o evento deve ser descartado (versão já vista ou mais antiga). */
function isStale(resourceKey: string, version: number): boolean {
  const last = applied.get(resourceKey);
  if (last !== undefined && version <= last) return true;
  applied.set(resourceKey, version);
  return false;
}

/** Aplica `nft.updated`: valida, deduplica por versão e escreve em detalhe + listas + carrinho. */
export function onNftUpdated(queryClient: QueryClient, raw: unknown): void {
  const event = nftUpdatedEventSchema.parse(raw);
  const { id } = event.resource;
  if (isStale(`nft:${id}`, event.version)) return;

  const { priceEth, editionsAvailable } = event.payload;

  // Detalhe (pode estar em cache por id OU por slug) — só patcheia a entrada cujo NFT bate.
  queryClient.setQueriesData<Nft>(
    { predicate: (q) => q.queryKey[0] === "nft" && q.queryKey[1] === "detail" },
    (data) => {
      if (!data || data.id !== id) return data;
      return {
        ...data,
        version: event.version,
        ...(priceEth !== undefined ? { priceEth } : {}),
        ...(editionsAvailable !== undefined ? { editionsAvailable } : {}),
      };
    },
  );

  // Páginas de catálogo em cache — patcheia o item onde aparecer.
  queryClient.setQueriesData<NftPage>(
    { predicate: (q) => q.queryKey[0] === "nft" && q.queryKey[1] === "list" },
    (data) => {
      if (!data) return data;
      let changed = false;
      const items = data.items.map((item) => {
        if (item.id !== id) return item;
        changed = true;
        return {
          ...item,
          version: event.version,
          ...(priceEth !== undefined ? { priceEth } : {}),
          ...(editionsAvailable !== undefined ? { editionsAvailable } : {}),
        };
      });
      return changed ? { ...data, items } : data;
    },
  );

  // Carrinho — reflete preço/disponibilidade do NFT de origem (§7: carrinho acompanha o catálogo).
  queryClient.setQueryData<Cart>(keys.cart, (cart) => {
    if (!cart) return cart;
    let changed = false;
    const items = cart.items.map((item) => {
      if (item.nftId !== id) return item;
      changed = true;
      return {
        ...item,
        version: event.version,
        ...(priceEth !== undefined ? { unitPriceEth: priceEth } : {}),
        ...(editionsAvailable !== undefined ? { availableEditions: editionsAvailable } : {}),
      };
    });
    return changed ? { ...cart, items } : cart;
  });
}

/** Aplica `order.updated`: valida, deduplica por versão e escreve o status/txRef no recibo. */
export function onOrderUpdated(queryClient: QueryClient, raw: unknown): void {
  const event = orderUpdatedEventSchema.parse(raw);
  const { id } = event.resource;
  if (isStale(`order:${id}`, event.version)) return;

  queryClient.setQueryData<Order>(keys.order.detail(id), (order) => {
    if (!order) return order;
    return {
      ...order,
      status: event.payload.status,
      version: event.version,
      ...(event.payload.txRef !== undefined ? { txRef: event.payload.txRef } : {}),
    };
  });
}
