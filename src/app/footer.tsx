import { Separator } from "@/components/ui/separator";

/**
 * Rodapé simplificado, coerente com o padrão visual do design. Links externos/fora de escopo (§3)
 * não aparentam sucesso funcional — são âncoras inertes rotuladas, sem navegação fabricada.
 */
const SOCIAL = ["Twitter", "Facebook", "LinkedIn"];
const FOOTER_LINKS = ["Mercado", "Criadores", "Aprenda", "Suporte"];

export function Footer() {
  return (
    <footer className="border-t border-border bg-ink">
      <div className="container flex flex-col gap-6 py-10">
        <div className="flex flex-col justify-between gap-6 sm:flex-row">
          <div className="space-y-2">
            <p className="text-body-sm font-bold tracking-[0.1em] text-foreground">KURIO</p>
            <p className="max-w-xs text-caption text-muted-foreground">
              Descubra NFTs selecionados de criadores do mundo todo e colecione arte digital
              verificada.
            </p>
          </div>
          <nav aria-label="Rodapé" className="flex flex-wrap gap-x-8 gap-y-2">
            {FOOTER_LINKS.map((label) => (
              <span
                key={label}
                aria-disabled="true"
                className="cursor-not-allowed text-caption text-muted-foreground"
              >
                {label}
              </span>
            ))}
          </nav>
        </div>
        <Separator />
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-caption text-muted-foreground">
            © {new Date().getFullYear()} Kurio. Projeto de demonstração.
          </p>
          <ul className="flex gap-4">
            {SOCIAL.map((label) => (
              <li key={label}>
                <span
                  aria-disabled="true"
                  className="cursor-not-allowed text-caption text-muted-foreground"
                >
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
