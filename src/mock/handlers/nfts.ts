/** NFTs (§5): listagem com busca/filtros/ordenação/paginação e detalhe por id ou slug. */
import { http } from "msw";
import { getNftParamsSchema, listNftsQuerySchema } from "@/contracts";
import { errors } from "@/mock/http-error";
import { store } from "@/mock/store";
import { currentScenario } from "@/mock/scenarios/apply";
import { API, guarded, HttpResponse, parseQuery } from "./_helpers";

export const nftHandlers = [
  http.get(
    `${API}/nfts`,
    guarded("nfts.list", ({ request }) => {
      const query = parseQuery(listNftsQuerySchema, request.url);
      if (currentScenario().emptyCatalog) {
        return HttpResponse.json({
          items: [],
          page: query.page,
          pageSize: query.pageSize,
          total: 0,
          hasNext: false,
        });
      }
      return HttpResponse.json(store.listNfts(query));
    }),
  ),

  http.get(
    `${API}/nfts/:idOrSlug`,
    guarded("nfts.get", ({ params }) => {
      const { idOrSlug } = getNftParamsSchema.parse(params);
      const nft = store.getNft(idOrSlug);
      if (!nft) throw errors.notFound("nft", "NFT não encontrado.");
      return HttpResponse.json(nft);
    }),
  ),
];
