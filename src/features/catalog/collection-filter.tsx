import { COLLECTIONS } from "./collections";
import { cn } from "@/lib/utils";

/**
 * Bloco "Coleções" (A4/A4b): toggles sem contagem — a UI não fabrica `(NN)` que o mock não expõe.
 * Reselecionar a coleção ativa limpa o filtro (toggle → `undefined`), por `fieldset`/`legend`
 * rotulado (§8).
 */
export function CollectionFilter({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (collection: string | undefined) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-body-lg font-bold text-foreground">Coleções</legend>
      <div className="flex flex-col gap-1 px-3">
        {COLLECTIONS.map((name) => {
          const active = value === name;
          return (
            <button
              key={name}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? undefined : name)}
              className={cn(
                "flex items-center justify-between rounded-sm py-2 text-left text-body-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "font-bold text-accent-text" : "text-secondary-text hover:text-foreground",
              )}
            >
              {name}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
