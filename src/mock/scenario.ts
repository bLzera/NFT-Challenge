/**
 * Superfície de controle dos cenários de mock.
 *
 * Expõe um estado global (cenário + seed) dirigível em runtime por:
 *  - query params da URL: `?scenario=<id>&seed=<n>`
 *  - API global no console/Playwright: `window.__mock.scenario(id)`, `.reset()`, `.seed(n)`
 *
 * Esta é apenas a camada de controle (Fase 0). Os efeitos de cada cenário
 * (latência, falhas, mudanças de preço, etc.) são plugados pela camada de mock
 * na Fase 2, que registra os cenários e o reset do store via `configureMockControls`.
 */

export const DEFAULT_SCENARIO = "default";
export const DEFAULT_SEED = 1;

export interface MockState {
  /** Identificador do cenário ativo (ex.: "order-timeout", "price-changed"). */
  scenario: string;
  /** Semente para geração determinística de dados. */
  seed: number;
}

export interface MockControlsConfig {
  /** Restaura o store a um estado conhecido do cenário atual. */
  resetStore?: () => void;
}

export interface MockControlsApi {
  /** Seleciona um cenário e reinicia o store para um estado conhecido. */
  scenario: (id: string) => MockState;
  /** Define a seed de geração determinística e reinicia o store. */
  seed: (value: number) => MockState;
  /** Restaura o store ao estado inicial do cenário atual. */
  reset: () => MockState;
  /** Retorna o estado de mock atual. */
  current: () => MockState;
}

declare global {
  interface Window {
    __mock?: MockControlsApi;
  }
}

let state: MockState = { scenario: DEFAULT_SCENARIO, seed: DEFAULT_SEED };
let config: MockControlsConfig = {};
const listeners = new Set<(state: MockState) => void>();

/** Estado de mock atual (lido pelos handlers REST e pelo servidor-socket). */
export function getMockState(): MockState {
  return state;
}

function setState(patch: Partial<MockState>): MockState {
  state = { ...state, ...patch };
  for (const listener of listeners) listener(state);
  return state;
}

/** Inscreve-se em mudanças do estado de mock. Retorna função de cleanup. */
export function onMockStateChange(listener: (state: MockState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Lê cenário/seed dos query params (sobrescrevem os padrões quando presentes). */
export function parseScenarioFromUrl(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): Partial<MockState> {
  const params = new URLSearchParams(search);
  const result: Partial<MockState> = {};

  const scenario = params.get("scenario");
  if (scenario) result.scenario = scenario;

  const seedRaw = params.get("seed");
  if (seedRaw !== null && seedRaw.trim() !== "" && !Number.isNaN(Number(seedRaw))) {
    result.seed = Number(seedRaw);
  }

  return result;
}

/**
 * Instala `window.__mock` e aplica o estado inicial (padrões + query params).
 * Chamada pela camada de mock na inicialização; recebe o reset do store.
 */
export function configureMockControls(initial: MockControlsConfig = {}): MockControlsApi {
  config = initial;
  setState({ ...parseScenarioFromUrl() });

  const api: MockControlsApi = {
    scenario(id: string) {
      const next = setState({ scenario: id });
      config.resetStore?.();
      return next;
    },
    seed(value: number) {
      const next = setState({ seed: value });
      config.resetStore?.();
      return next;
    },
    reset() {
      config.resetStore?.();
      return state;
    },
    current() {
      return state;
    },
  };

  if (typeof window !== "undefined") {
    window.__mock = api;
  }
  return api;
}
