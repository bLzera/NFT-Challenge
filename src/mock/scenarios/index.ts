/**
 * Liga a engine de cenários ao controle de runtime (ver mock.spec.md § Engine).
 *
 * Reusa o `configureMockControls` (Fase 0: `window.__mock` + `?scenario=&seed=`), plugando o
 * `resetStore` real e aplicando os efeitos de ativação de cada cenário (TTL de sessão, mudança
 * agendada de NFT). Chamado uma vez no bootstrap por `enableMocks`.
 */
import { mulEth, nftIdSchema, type StockQuantity } from "@/contracts";
import { configureMockControls, getMockState } from "@/mock/scenario";
import { store } from "@/mock/store";
import { currentScenario, resetRandom } from "./apply";
import type { ScenarioDef } from "./registry";

const DEFAULT_SESSION_TTL_MS = 60 * 60 * 1000;
const DEMO_NFT_ID = nftIdSchema.parse("nft-001");

/** Timers de efeito agendados pelo cenário (mudança de NFT); limpos a cada reativação. */
const effectTimers = new Set<ReturnType<typeof setTimeout>>();

function clearEffectTimers(): void {
  for (const t of effectTimers) clearTimeout(t);
  effectTimers.clear();
}

/** Aplica os efeitos de ativação do cenário atual (config do store + mudança agendada de NFT). */
function activate(): void {
  const def: ScenarioDef = currentScenario();
  store.configure({ sessionTtlMs: def.sessionTtlMs ?? DEFAULT_SESSION_TTL_MS });
  resetRandom();
  clearEffectTimers();

  if (def.nftUpdateAfterMs && def.nftUpdateKind) {
    const timer = setTimeout(() => {
      effectTimers.delete(timer);
      // Alvo preferencial: um NFT que o usuário tenha no carrinho (fecha o loop §7); senão, demo fixo.
      const targetId = store.firstCartNftId() ?? DEMO_NFT_ID;
      const nft = store.getNft(targetId);
      if (!nft) return;
      if (def.nftUpdateKind === "price") {
        store.updateNft(nft.id, { priceEth: mulEth(nft.priceEth, 1.25) }); // +25%
      } else {
        store.updateNft(nft.id, { editionsAvailable: 0 as StockQuantity });
      }
    }, def.nftUpdateAfterMs);
    effectTimers.add(timer);
  }
}

/** Instala o controle de cenários e carrega o estado inicial (persistido ou semeado). */
export function installScenarios(): void {
  configureMockControls({
    resetStore: () => {
      store.setScenarioKey(getMockState());
      store.reset();
      activate();
    },
  });
  store.hydrate(getMockState());
  activate();
}
