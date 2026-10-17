import { beforeEach, describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import type { Favorites, NftId } from "@/contracts";
import { keys } from "@/lib/query/keys";
import { toggleFavoriteMutationOptions } from "./use-toggle-favorite";

const NFT = "nft-001" as NftId;

// Contexto da mutation (4º arg dos callbacks no TanStack Query v5); irrelevante para esta lógica.
const MC = {} as never;

function seed(qc: QueryClient, favorites: Favorites) {
  qc.setQueryData<Favorites>(keys.favorites, favorites);
}

let qc: QueryClient;

beforeEach(() => {
  qc = new QueryClient();
});

describe("toggleFavoriteMutationOptions", () => {
  it("onMutate adiciona otimista e devolve o snapshot anterior", async () => {
    seed(qc, { nftIds: [], version: 3 } as unknown as Favorites);
    const opts = toggleFavoriteMutationOptions(qc);

    const ctx = await opts.onMutate!(NFT, MC);
    const now = qc.getQueryData<Favorites>(keys.favorites)!;
    expect(now.nftIds).toContain(NFT);
    expect(now.version).toBe(3); // version não é inventada pelo cliente
    expect(ctx?.previous?.nftIds).toEqual([]);
  });

  it("onMutate remove quando já é favorito", async () => {
    seed(qc, { nftIds: [NFT], version: 3 } as unknown as Favorites);
    await toggleFavoriteMutationOptions(qc).onMutate!(NFT, MC);
    expect(qc.getQueryData<Favorites>(keys.favorites)!.nftIds).not.toContain(NFT);
  });

  it("onError faz rollback para o snapshot", async () => {
    seed(qc, { nftIds: [], version: 3 } as unknown as Favorites);
    const opts = toggleFavoriteMutationOptions(qc);

    const ctx = await opts.onMutate!(NFT, MC);
    expect(qc.getQueryData<Favorites>(keys.favorites)!.nftIds).toContain(NFT);

    opts.onError!(new Error("falhou"), NFT, ctx, MC);
    expect(qc.getQueryData<Favorites>(keys.favorites)!.nftIds).toEqual([]);
  });

  it("onSuccess adota o estado do servidor (version autoritativa)", () => {
    seed(qc, { nftIds: [], version: 3 } as unknown as Favorites);
    const server = { nftIds: [NFT], version: 4 } as unknown as Favorites;
    toggleFavoriteMutationOptions(qc).onSuccess!(server, NFT, { previous: undefined }, MC);
    expect(qc.getQueryData<Favorites>(keys.favorites)).toEqual(server);
  });
});
