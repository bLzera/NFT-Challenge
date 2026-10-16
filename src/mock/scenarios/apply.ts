/**
 * Execução dos efeitos de cenário por rota (ver mock.spec.md § Engine). Determinístico: a
 * latência e o jitter saem de um PRNG semeado por `seed`, então o mesmo `?seed=` reproduz o
 * mesmo comportamento. Chamado no início de cada handler via `applyRoute(route)`.
 */
import { getMockState } from "@/mock/scenario";
import { errors } from "@/mock/http-error";
import { getScenarioDef, type ScenarioDef } from "./registry";
import type { RouteKey } from "./routes";

/** Falha de conexão (sem resposta HTTP) — o handler traduz para `HttpResponse.error()`. */
export class NetworkError extends Error {
  constructor() {
    super("Falha de conexão simulada (cenário offline).");
    this.name = "NetworkError";
  }
}

/** PRNG determinístico (mulberry32). Combinado com um contador por chamada p/ variar o jitter. */
let callCounter = 0;
function nextRandom(seed: number): number {
  let t = (seed + callCounter++ * 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function matches(set: "all" | RouteKey[] | undefined, route: RouteKey): boolean {
  if (!set) return false;
  return set === "all" || set.includes(route);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Aplica latência e falhas genéricas (offline/transitória) da rota no cenário atual.
 * Lança `NetworkError` (conexão) ou `MockError` (HTTP) quando o cenário assim definir.
 * Efeitos específicos de domínio (vazio, cupom, timeout de pedido) ficam nos handlers,
 * que leem o def via `currentScenario()`.
 */
export async function applyRoute(route: RouteKey): Promise<void> {
  const { scenario, seed } = getMockState();
  const def = getScenarioDef(scenario);

  const [min, max] = def.latency;
  const span = Math.max(0, max - min);
  await delay(min + Math.floor(nextRandom(seed) * (span + 1)));

  if (matches(def.offlineRoutes, route)) throw new NetworkError();
  if (matches(def.transientRoutes, route)) {
    throw errors.transient("Serviço temporariamente indisponível.");
  }
  if (def.clientError && matches(def.clientError.routes, route)) {
    switch (def.clientError.kind) {
      case "forbidden":
        throw errors.forbidden("Acesso não autorizado (cenário).");
      case "not_found":
        throw errors.notFound("resource", "Recurso não encontrado (cenário http-4xx).");
      case "validation":
        throw errors.validation({ _: ["Requisição inválida (cenário http-4xx)."] });
    }
  }
}

/** Lê o cenário atual (handlers consultam flags específicas: emptyCatalog, orderTimeout, ...). */
export function currentScenario(): ScenarioDef {
  return getScenarioDef(getMockState().scenario);
}

/** Reinicia o contador do PRNG (chamado no reset de cenário p/ reprodutibilidade). */
export function resetRandom(): void {
  callCounter = 0;
}
