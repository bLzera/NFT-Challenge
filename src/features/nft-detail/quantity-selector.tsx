import { useId } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantitySelectorProps {
  value: number;
  max: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Seletor de quantidade (A4): inteiro em `[1, max]`, `max = editionsAvailable`. Clamp no
 * incremento/decremento e ao digitar — nunca emite valor fora do intervalo. `−` desabilita em 1,
 * `+` desabilita em `max`; tudo desabilita quando `max === 0` (esgotado, via prop `disabled`).
 * `role="spinbutton"` via `<input type="number">` com `aria-valuemin`/`aria-valuemax` (§8).
 * `id` gerado via `useId()`: a tela renderiza esta instância duas vezes (painel desktop oculto no
 * mobile + Buy Bar fixa oculta no desktop) — IDs únicos evitam colisão de `label htmlFor`.
 */
export function QuantitySelector({
  value,
  max,
  onChange,
  disabled = false,
  className,
}: QuantitySelectorProps) {
  const inputId = useId();
  const clamp = (n: number) => Math.min(Math.max(n, 1), Math.max(max, 1));

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <label htmlFor={inputId} className="text-body-sm font-medium text-secondary-text">
        Qtd.
      </label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Diminuir quantidade"
          disabled={disabled || value <= 1}
          onClick={() => onChange(clamp(value - 1))}
          className="flex size-8 items-center justify-center rounded-full bg-primary text-ink transition-opacity disabled:opacity-40"
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <input
          id={inputId}
          type="number"
          role="spinbutton"
          inputMode="numeric"
          min={1}
          max={Math.max(max, 1)}
          step={1}
          value={value}
          disabled={disabled}
          aria-valuemin={1}
          aria-valuemax={Math.max(max, 1)}
          aria-valuenow={value}
          onChange={(e) => {
            const parsed = Number.parseInt(e.target.value, 10);
            if (Number.isNaN(parsed)) return;
            onChange(clamp(parsed));
          }}
          className="h-9 w-14 rounded-md border border-border bg-transparent text-center text-title font-bold text-foreground disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          aria-label="Aumentar quantidade"
          disabled={disabled || value >= max}
          onClick={() => onChange(clamp(value + 1))}
          className="flex size-8 items-center justify-center rounded-full bg-primary text-ink transition-opacity disabled:opacity-40"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
