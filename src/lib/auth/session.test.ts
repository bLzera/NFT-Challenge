import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@/contracts";
import { keys } from "@/lib/query/keys";
import { queryClient } from "@/lib/query/query-client";

// Isola a orquestração: a rede, o token e o tempo real são dublês. O foco é o fluxo de isolamento
// por usuário (§11) — quem chama teardown, quando, e o que acaba no cache de sessão.
vi.mock("@/lib/http/api", () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  getSession: vi.fn(),
}));
vi.mock("@/lib/realtime", () => ({
  initRealtime: vi.fn(),
  connectRealtime: vi.fn(),
  teardownUserData: vi.fn(),
}));
vi.mock("@/lib/http/token-store", () => ({ getToken: vi.fn() }));
vi.mock("@/lib/http/client", () => ({ configureHttp: vi.fn() }));

import { getSession, login, logout, register } from "@/lib/http/api";
import { configureHttp } from "@/lib/http/client";
import { getToken } from "@/lib/http/token-store";
import { connectRealtime, teardownUserData } from "@/lib/realtime";
import { bootSession, initDataLayer, signIn, signOut, signUp } from "./session";

function session(userId: string, token = `mock-token:${userId}:999`): Session {
  return {
    user: { id: userId, email: `${userId}@x.io`, displayName: userId, createdAt: "2026-01-01T00:00:00.000Z" },
    token,
    expiresAt: "2026-12-31T00:00:00.000Z",
  } as unknown as Session;
}

beforeEach(() => {
  vi.clearAllMocks();
  queryClient.clear();
});

describe("signIn / signUp (adoção de sessão)", () => {
  it("faz teardown ANTES de adotar a nova sessão e conecta o realtime com o token", async () => {
    vi.mocked(login).mockResolvedValue(session("u1"));

    const result = await signIn({ email: "u1@x.io", password: "secret123" });

    expect(teardownUserData).toHaveBeenCalledTimes(1);
    expect(connectRealtime).toHaveBeenCalledWith("mock-token:u1:999");
    // teardown precede connect (ordem importa: limpa antes de semear o novo usuário).
    expect(vi.mocked(teardownUserData).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(connectRealtime).mock.invocationCallOrder[0],
    );
    expect(queryClient.getQueryData(keys.session)).toEqual(result);
  });

  it("troca de usuário herda cache: teardown roda mesmo quando a sessão anterior saiu por 401", async () => {
    // Simula o estado pós-401: cache de sessão já zerado para null, mas dados privados residuais.
    queryClient.setQueryData(keys.session, null);
    queryClient.setQueryData(keys.favorites, { nftIds: ["nft-001"], version: 2 });
    vi.mocked(register).mockResolvedValue(session("u2"));

    await signUp({ email: "u2@x.io", password: "secret123", displayName: "u2" });

    // O teardown (incondicional) é quem limpa o resíduo — aqui garantimos que foi chamado.
    expect(teardownUserData).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(keys.session)).toEqual(session("u2"));
  });
});

describe("signOut", () => {
  it("faz logout na API, teardown e zera a sessão", async () => {
    vi.mocked(logout).mockResolvedValue(undefined);
    queryClient.setQueryData(keys.session, session("u1"));

    await signOut();

    expect(logout).toHaveBeenCalledTimes(1);
    expect(teardownUserData).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(keys.session)).toBeNull();
  });
});

describe("initDataLayer → onUnauthenticated (401/sessão expirada)", () => {
  it("faz teardown completo e reflete a sessão nula", () => {
    initDataLayer();
    const cfg = vi.mocked(configureHttp).mock.calls[0][0];

    queryClient.setQueryData(keys.session, session("u1"));
    cfg.onUnauthenticated!();

    expect(teardownUserData).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(keys.session)).toBeNull();
  });
});

describe("bootSession", () => {
  it("sem token salvo não busca sessão nem conecta", async () => {
    vi.mocked(getToken).mockReturnValue(null);
    expect(await bootSession()).toBeNull();
    expect(getSession).not.toHaveBeenCalled();
    expect(connectRealtime).not.toHaveBeenCalled();
  });

  it("com token válido revalida a sessão e conecta o realtime", async () => {
    vi.mocked(getToken).mockReturnValue("mock-token:u1:999");
    vi.mocked(getSession).mockResolvedValue(session("u1"));

    const result = await bootSession();

    expect(result).toEqual(session("u1"));
    expect(connectRealtime).toHaveBeenCalledWith("mock-token:u1:999");
  });

  it("com token inválido (sessão nula) não conecta o realtime", async () => {
    vi.mocked(getToken).mockReturnValue("expirado");
    vi.mocked(getSession).mockResolvedValue(null);

    expect(await bootSession()).toBeNull();
    expect(connectRealtime).not.toHaveBeenCalled();
  });
});
