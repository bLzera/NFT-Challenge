import { useEffect, useRef, useState, type FormEvent } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * Busca textual (`q`, A2): rascunho local até o commit (Enter imediato + debounce ~300ms), mas a
 * verdade continua no `search` da URL — `value` vem de lá e sincroniza o rascunho em navegação por
 * histórico/deep-link. `role="searchbox"`/`type="search"`, label associada (§8).
 */
export function SearchBox({
  value,
  onCommit,
}: {
  value: string | undefined;
  onCommit: (q: string | undefined) => void;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Sincroniza o rascunho quando o `search` muda por fora (voltar/avançar, deep-link, limpar filtros).
  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  // Limpa o debounce pendente no unmount — evita `commit` disparando após o componente sair da árvore.
  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  function commit(next: string) {
    onCommit(next.trim() === "" ? undefined : next.trim());
  }

  function handleChange(next: string) {
    setDraft(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commit(next), 300);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    commit(draft);
  }

  function handleClear() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setDraft("");
    commit("");
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="flex w-full max-w-md items-center gap-2">
      <label htmlFor="catalog-search" className="sr-only">
        Buscar por título, coleção ou criador
      </label>
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id="catalog-search"
          type="search"
          role="searchbox"
          placeholder="Buscar por título, coleção ou criador"
          value={draft}
          onChange={(e) => handleChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {draft !== "" && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Limpar busca"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <Button type="submit" size="sm" variant="secondary">
        Buscar
      </Button>
    </form>
  );
}
