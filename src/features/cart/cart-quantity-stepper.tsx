import { useId } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CartQuantityStepperProps {
  value: number;
  max: number;
  disabled?: boolean;
  busy?: boolean;
  onChange: (next: number) => void;
  className?: string;
}

/**
 * Stepper de quantidade do item de carrinho (A5/§8): alvo local clampado a `[1, max]`
 * (`max = availableEditions`), feedback imediato; quem chama decide quando disparar
 * `updateCartItem` com o valor resultante (debounce/commit fica em `cart-screen.tsx`).
 * `−` desabilita em `value<=1`, `+` desabilita em `value>=max` — nunca envia quantidade acima de
 * `max` (A5), mesmo quando `value` já chegou maior que `max` (disponibilidade reduzida por
 * `nft.updated`, §7): nesse caso o incremento fica desabilitado e só o decremento segue ativo,
 * deixando o usuário reduzir até o limite. O valor exibido (`value`) nunca é forçado aqui — só a
 * habilitação dos controles reage ao clamp, o dado em si vem do servidor (A4).
 * `aria-disabled` + `disabled` real (teclado não foca em botão inoperante). `aria-busy` durante a
 * mutação em voo (A4).
 */
export function CartQuantityStepper({
  value,
  max,
  disabled = false,
  busy = false,
  onChange,
  className,
}: CartQuantityStepperProps) {
  const labelId = useId();
  const clamp = (n: number) => Math.min(Math.max(n, 1), Math.max(max, 1));
  const atMin = value <= 1;
  const atMax = value >= max; // cobre também value > max (disponibilidade reduzida abaixo da qtd atual).

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      role="group"
      aria-label="Quantidade"
      aria-busy={busy}
    >
      <button
        type="button"
        aria-label="Diminuir quantidade"
        aria-disabled={disabled || atMin}
        disabled={disabled || atMin}
        onClick={() => onChange(clamp(value - 1))}
        className="flex size-8 items-center justify-center rounded-full border border-border bg-surface-raised text-foreground transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 lg:size-10 lg:border-0 lg:bg-primary lg:text-ink"
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <span id={labelId} aria-live="polite" className="min-w-6 text-center text-label font-bold text-foreground">
        {value}
      </span>
      <button
        type="button"
        aria-label="Aumentar quantidade"
        aria-disabled={disabled || atMax}
        disabled={disabled || atMax}
        onClick={() => onChange(clamp(value + 1))}
        className="flex size-8 items-center justify-center rounded-full border border-border bg-surface-raised text-foreground transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 lg:size-10 lg:border-0 lg:bg-primary lg:text-ink"
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
