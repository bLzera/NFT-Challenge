import { useState, type FormEvent } from "react";
import { parseEth, type EthAmount } from "@/contracts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

/**
 * Bloco "Faixa de preço" (A5): dois inputs decimais + "Aplicar" em vez do slider decorativo do
 * Figma (sem componente de slider acessível na base shadcn). Rascunho local (A2) até o commit;
 * valor ETH sempre como string decimal (`parseEth` marca o brand `EthAmount` após validar) — sem
 * aritmética de dinheiro na UI, só validação leve (decimal ≥ 0 e mín ≤ máx) antes de gravar no
 * `search`; o servidor é a autoridade (`gteEth`).
 */
export function PriceFilter({
  minPriceEth,
  maxPriceEth,
  onApply,
}: {
  minPriceEth: string | undefined;
  maxPriceEth: string | undefined;
  onApply: (range: { minPriceEth: EthAmount | undefined; maxPriceEth: EthAmount | undefined }) => void;
}) {
  const [min, setMin] = useState(minPriceEth ?? "");
  const [max, setMax] = useState(maxPriceEth ?? "");
  const [error, setError] = useState<string | undefined>();

  function isValidDecimal(value: string): boolean {
    if (value === "") return true;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isValidDecimal(min) || !isValidDecimal(max)) {
      setError("Informe um valor decimal válido (≥ 0).");
      return;
    }
    if (min !== "" && max !== "" && Number(min) > Number(max)) {
      setError("O valor mínimo não pode ser maior que o máximo.");
      return;
    }
    setError(undefined);
    onApply({
      minPriceEth: min === "" ? undefined : parseEth(min),
      maxPriceEth: max === "" ? undefined : parseEth(max),
    });
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-body-lg font-bold text-foreground">Faixa de preço</legend>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-3">
        <p className="text-caption text-muted-foreground">Preço em ETH (ex.: 0.05 – 4.02)</p>
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <Label htmlFor="price-min">Mín.</Label>
            <Input
              id="price-min"
              inputMode="decimal"
              placeholder="0.05"
              value={min}
              onChange={(e) => setMin(e.target.value)}
              aria-invalid={Boolean(error)}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <Label htmlFor="price-max">Máx.</Label>
            <Input
              id="price-max"
              inputMode="decimal"
              placeholder="4.02"
              value={max}
              onChange={(e) => setMax(e.target.value)}
              aria-invalid={Boolean(error)}
            />
          </div>
        </div>
        {error && (
          <p role="alert" className="text-caption text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="sm">
          Aplicar
        </Button>
      </form>
    </fieldset>
  );
}
