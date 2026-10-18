/**
 * Registro declarativo dos cenários determinísticos (§6). Cada cenário descreve seus efeitos;
 * `apply.ts` os executa de forma reprodutível (semeado por `seed`). Ver mock.spec.md § Engine.
 */
import type { OrderStatus } from "@/contracts";
import type { RouteKey } from "./routes";

/** Faixa de latência [min, max] em ms. Latência variável = sorteio semeado nessa faixa. */
export type LatencyRange = [number, number];

export interface ScenarioDef {
  describe: string;
  /** Latência base aplicada a toda rota. */
  latency: LatencyRange;
  /** Catálogo e listagens respondem vazio. */
  emptyCatalog?: boolean;
  /** Rotas que falham por indisponibilidade de conexão (erro de rede do Axios). */
  offlineRoutes?: "all" | RouteKey[];
  /** Rotas que respondem erro HTTP transitório (503). */
  transientRoutes?: "all" | RouteKey[];
  /** Rotas que respondem erro de cliente (4xx) determinístico. */
  clientError?: { routes: "all" | RouteKey[]; kind: "validation" | "forbidden" | "not_found" };
  /** TTL de sessão (ms) — `session-expired` encurta p/ expirar durante a navegação. */
  sessionTtlMs?: number;
  /** Força `conflict(registration)` no cadastro, mesmo com e-mail novo. */
  forceRegisterConflict?: boolean;
  /** Resolução terminal do pedido (ciclo de vida → order.updated). */
  orderResolution?: { status: Extract<OrderStatus, "confirmed" | "declined">; delayMs: number };
  /** `POST /orders` sofre timeout na 1ª tentativa; retry com mesma chave recupera (idempotência). */
  orderTimeout?: boolean;
  /** Agenda uma mudança de preço/disponibilidade de NFT após N ms (dispara nft.updated). */
  nftUpdateAfterMs?: number;
  /** Tipo da mudança agendada: subir o preço ou esgotar a edição do NFT de demonstração. */
  nftUpdateKind?: "price" | "sold-out";
}

const DEFAULT_RESOLUTION = { status: "confirmed" as const, delayMs: 1500 };

export const SCENARIOS: Record<string, ScenarioDef> = {
  default: {
    describe: "Caminho feliz; latências curtas realistas.",
    latency: [120, 320],
    orderResolution: DEFAULT_RESOLUTION,
  },
  empty: {
    describe: "Catálogo e listagens vazias.",
    latency: [120, 300],
    emptyCatalog: true,
  },
  slow: {
    describe: "Latência alta e constante.",
    latency: [1500, 2200],
    orderResolution: { status: "confirmed", delayMs: 2500 },
  },
  jitter: {
    describe: "Latência variável e respostas fora de ordem.",
    latency: [100, 2000],
    orderResolution: DEFAULT_RESOLUTION,
  },
  offline: {
    describe: "Falha de conexão em todas as chamadas.",
    latency: [80, 200],
    offlineRoutes: "all",
  },
  "http-5xx": {
    describe: "Falha transitória (503) em todas as chamadas.",
    latency: [120, 300],
    transientRoutes: "all",
  },
  "favorites-toggle-5xx": {
    describe: "Só o toggle de favorito falha (503); sessão e leitura seguem OK — exercita o rollback otimista.",
    latency: [120, 300],
    transientRoutes: ["favorites.toggle"],
  },
  "http-4xx": {
    describe: "Respostas HTTP 4xx (not_found) nas chamadas.",
    latency: [120, 300],
    clientError: { routes: "all", kind: "not_found" },
  },
  unauthorized: {
    describe: "Acesso não autorizado (403) nas rotas protegidas.",
    latency: [120, 300],
    clientError: {
      routes: [
        "favorites.get",
        "favorites.toggle",
        "quote.create",
        "orders.create",
        "orders.get",
        "profile.get",
        "profile.update",
        "profile.avatar",
        "profile.password",
        "wallets.list",
        "wallets.create",
        "wallets.update",
      ],
      kind: "forbidden",
    },
  },
  "session-expired": {
    describe: "Sessão expira durante a navegação → 401 em rotas protegidas.",
    latency: [120, 300],
    sessionTtlMs: 2000,
    orderResolution: DEFAULT_RESOLUTION,
  },
  "register-conflict": {
    describe: "Cadastro sempre em conflito (e-mail já existente).",
    latency: [120, 300],
    forceRegisterConflict: true,
  },
  "coupon-invalid": {
    describe: "Cupom inválido na cotação (use NOPE).",
    latency: [120, 300],
    orderResolution: DEFAULT_RESOLUTION,
  },
  "coupon-expired": {
    describe: "Cupom expirado na cotação (use EXPIRED5).",
    latency: [120, 300],
    orderResolution: DEFAULT_RESOLUTION,
  },
  "price-changed": {
    describe: "Preço de um NFT muda durante a navegação (nft.updated) → cotação desatualizada.",
    latency: [120, 320],
    nftUpdateAfterMs: 4000,
    nftUpdateKind: "price",
    orderResolution: DEFAULT_RESOLUTION,
  },
  "sold-out-during-purchase": {
    describe: "Edição esgota durante a compra → conflict(availability) no checkout.",
    latency: [120, 320],
    nftUpdateAfterMs: 3000,
    nftUpdateKind: "sold-out",
    orderResolution: DEFAULT_RESOLUTION,
  },
  "order-timeout": {
    describe: "Timeout após criar o pedido; retry com mesma chave recupera (idempotência).",
    latency: [120, 320],
    orderTimeout: true,
    orderResolution: DEFAULT_RESOLUTION,
  },
  "payment-confirmed": {
    describe: "Pagamento confirmado (order.updated: confirmed).",
    latency: [120, 320],
    orderResolution: { status: "confirmed", delayMs: 1200 },
  },
  "payment-declined": {
    describe: "Pagamento recusado (order.updated: declined).",
    latency: [120, 320],
    orderResolution: { status: "declined", delayMs: 1200 },
  },
};

export function getScenarioDef(id: string): ScenarioDef {
  return SCENARIOS[id] ?? SCENARIOS.default;
}

/** Ids conhecidos (para listar em `window.__mock`/docs). */
export const SCENARIO_IDS = Object.keys(SCENARIOS);
