import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

/** Rota inexistente / acesso direto inválido (§4). Padrão visual do design. */
export function NotFound() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-4 py-24 text-center">
      <p className="text-display-sm font-bold text-primary">404</p>
      <h1 className="text-heading-sm font-bold text-foreground">Página não encontrada</h1>
      <p className="text-body-sm text-muted-foreground">
        O endereço acessado não existe ou foi movido.
      </p>
      <Button asChild>
        <Link to="/">Voltar ao início</Link>
      </Button>
    </section>
  );
}
