import type { ListNftsQuery } from "@/contracts";
import { cn } from "@/lib/utils";

const OPTIONS: { value: NonNullable<ListNftsQuery["availability"]>; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "available", label: "Disponível" },
  { value: "sold_out", label: "Esgotado" },
];

/** Bloco "Disponibilidade" (`availability`): todos/disponível/esgotado — toggle simples. */
export function AvailabilityFilter({
  value,
  onChange,
}: {
  value: ListNftsQuery["availability"];
  onChange: (availability: ListNftsQuery["availability"]) => void;
}) {
  const current = value ?? "all";
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-body-lg font-bold text-foreground">Disponibilidade</legend>
      <div className="flex gap-2 px-3" role="group" aria-label="Disponibilidade">
        {OPTIONS.map((opt) => {
          const active = current === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(opt.value === "all" ? undefined : opt.value)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-caption transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-secondary-text hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
