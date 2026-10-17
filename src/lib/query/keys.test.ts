import { describe, expect, it } from "vitest";
import type { ListNftsQuery } from "@/contracts";
import { keys, normalizeNftQuery } from "./keys";

describe("normalizeNftQuery", () => {
  it("é estável independente da ordem das chaves", () => {
    const a = normalizeNftQuery({ q: "ape", sort: "price_asc", page: 1 } as Partial<ListNftsQuery>);
    const b = normalizeNftQuery({ page: 1, q: "ape", sort: "price_asc" } as Partial<ListNftsQuery>);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("descarta undefined e string vazia", () => {
    const out = normalizeNftQuery({ q: "", collection: undefined, sort: "recent" } as Partial<ListNftsQuery>);
    expect(out).toEqual({ sort: "recent" });
  });
});

describe("keys", () => {
  it("chaves de lista com a mesma consulta colidem (mesmo cache)", () => {
    const k1 = keys.nft.list({ q: "ape", page: 1 } as Partial<ListNftsQuery>);
    const k2 = keys.nft.list({ page: 1, q: "ape" } as Partial<ListNftsQuery>);
    expect(JSON.stringify(k1)).toBe(JSON.stringify(k2));
  });

  it("detalhe e lista compartilham o prefixo 'nft' para invalidação em bloco", () => {
    expect(keys.nft.detail("nft-001")[0]).toBe("nft");
    expect(keys.nft.lists()[0]).toBe("nft");
  });
});
