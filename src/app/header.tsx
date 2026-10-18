import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { skipToken, useQuery } from "@tanstack/react-query";
import { Heart, LogOut, Menu, Search, ShoppingCart, User, Wallet } from "lucide-react";
import type { Cart } from "@/contracts";
import { signOut } from "@/lib/auth/session";
import { useSession } from "@/lib/auth/use-session";
import { keys } from "@/lib/query/keys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Itens de navegação. Início/Mercado levam ao catálogo (`/`); Criadores/Aprenda são fora de escopo. */
type NavItem = { label: string; to: "/"; inScope: true } | { label: string; inScope: false };

const NAV_ITEMS: NavItem[] = [
  { label: "Início", to: "/", inScope: true },
  // Mercado/Criadores/Aprenda: destinos ainda sem rota própria. Tratados como "em breve" (§3) até
  // a feature `catalog` expor rotas distintas — evita dois itens ativos sobre `/`.
  { label: "Mercado", inScope: false },
  { label: "Criadores", inScope: false },
  { label: "Aprenda", inScope: false },
];

/**
 * Lê a contagem de itens do carrinho **do cache** sem disparar fetch (`skipToken`). Tolerante: antes
 * da feature `cart` existir, o cache está vazio e a contagem é 0 (badge oculto).
 */
function useCartCount(): number {
  const { data } = useQuery<Cart>({ queryKey: keys.cart, queryFn: skipToken });
  if (!data) return 0;
  return data.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function Header() {
  const currentHref = useRouterState({ select: (s) => s.location.href });
  const { session, isAuthenticated } = useSession();
  const cartCount = useCartCount();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-ink/95 backdrop-blur supports-[backdrop-filter]:bg-ink/80">
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Esquerda: wordmark + nav (desktop) */}
        <div className="flex items-center gap-8">
          <Link to="/" className="text-body-sm font-bold tracking-[0.1em] text-foreground">
            KURIO
          </Link>
          <nav aria-label="Navegação principal" className="hidden items-center gap-8 md:flex">
            {NAV_ITEMS.map((item, i) =>
              item.inScope ? (
                <Link
                  key={i}
                  to={item.to}
                  activeOptions={{ exact: true }}
                  className="relative py-1 text-body transition-colors hover:text-accent-text"
                  activeProps={{
                    className:
                      "font-bold text-accent-text after:absolute after:inset-x-0 after:-bottom-1 after:h-[3px] after:bg-primary",
                  }}
                  inactiveProps={{ className: "text-foreground" }}
                >
                  {item.label}
                </Link>
              ) : (
                <OutOfScopeNavItem key={i} label={item.label} />
              ),
            )}
          </nav>
        </div>

        {/* Direita: busca + carrinho + conta */}
        <div className="flex items-center gap-3 sm:gap-7">
          <HeaderSearch />

          <Button
            asChild
            variant="ghost"
            size="icon"
            className="relative text-foreground hover:text-accent-text"
          >
            <Link to="/cart" aria-label={`Carrinho${cartCount ? `, ${cartCount} itens` : ""}`}>
              <ShoppingCart />
              {cartCount > 0 && (
                <Badge className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center border-2 border-ink px-1 text-tiny">
                  {cartCount > 9 ? "9+" : cartCount}
                </Badge>
              )}
            </Link>
          </Button>

          {isAuthenticated ? (
            <AccountMenu displayName={session?.user.displayName ?? "Minha conta"} />
          ) : (
            <Button asChild size="sm">
              <Link to="/login" search={{ redirect: currentHref }}>
                <User />
                Entrar
              </Link>
            </Button>
          )}

          <MobileNav />
        </div>
      </div>
    </header>
  );
}

/**
 * Busca (Figma: ícone no header, não campo no catálogo). O ícone abre um diálogo acessível (Radix:
 * foco preso, Esc, `aria-modal`); submeter navega para o catálogo com `?q=` — a fonte única do estado
 * de busca continua na URL da rota `/` (useCatalogSearch lê de lá). Pré-preenche com o `q` atual.
 */
function HeaderSearch() {
  const navigate = useNavigate();
  const currentQ = useRouterState({
    select: (s) => (s.location.search as { q?: string }).q ?? "",
  });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (open) setDraft(currentQ);
  }, [open, currentQ]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const q = draft.trim();
    void navigate({ to: "/", search: { q: q === "" ? undefined : q } });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-foreground hover:text-accent-text" aria-label="Buscar NFTs">
          <Search />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Buscar NFTs</DialogTitle>
          <DialogDescription>Busque por título, coleção ou criador.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} role="search" className="flex items-center gap-2">
          <label htmlFor="header-search" className="sr-only">
            Buscar por título, coleção ou criador
          </label>
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="header-search"
              type="search"
              role="searchbox"
              autoFocus
              placeholder="Buscar por título, coleção ou criador"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" size="sm">
            Buscar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Item de nav fora de escopo (§3): presente visualmente, não navega nem aparenta sucesso. Focável
 * por teclado para que o tooltip "Em breve" abra no foco (não só no hover) e com sufixo `sr-only`
 * garantindo que leitores de tela anunciem a indisponibilidade sem depender do tooltip (§8).
 */
function OutOfScopeNavItem({ label }: { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="link"
          aria-disabled="true"
          tabIndex={0}
          className="cursor-not-allowed rounded-sm py-1 text-body text-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {label}
          <span className="sr-only"> (em breve)</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>Em breve</TooltipContent>
    </Tooltip>
  );
}

function AccountMenu({ displayName }: { displayName: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-foreground">
          <User className="size-4" />
          <span className="hidden max-w-[12ch] truncate sm:inline">{displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile">
            <User />
            Perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/wallets">
            <Wallet />
            Carteiras
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/favorites">
            <Heart />
            Favoritos
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Navegação em telas estreitas (≤768): menu com foco gerenciado pelo Radix. */
function MobileNav() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-foreground md:hidden" aria-label="Menu">
          <Menu />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to="/">Início</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/">Mercado</Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>Criadores</DropdownMenuItem>
        <DropdownMenuItem disabled>Aprenda</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
