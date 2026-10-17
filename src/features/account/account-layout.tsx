import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  Download,
  Heart,
  LifeBuoy,
  LogOut,
  Tag,
  User,
  Wallet as WalletIcon,
} from "lucide-react";
import { signOut } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

type AccountSection = "profile" | "wallets" | "favorites";

interface AccountLayoutProps {
  active: AccountSection;
  children: ReactNode;
}

/**
 * Layout compartilhado da conta (A1/A2/A6 da spec `account`): sidebar "Meu perfil" do Figma
 * (`Desktop_Perfil_*`/`Desktop_Carteiras`) + slot de conteúdo, reusado via composição React pelas 3
 * telas. Não cria rota-pai — cada `component` de rota já registrado monta
 * `<AccountLayout active="...">`. No mobile/tablet (A6) a sidebar colapsa num nav horizontal rolável
 * no topo do conteúdo.
 */
export function AccountLayout({ active, children }: AccountLayoutProps) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-7">
      <AccountSidebar active={active} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

interface NavLinkItem {
  key: AccountSection;
  label: string;
  to: "/profile" | "/wallets" | "/favorites";
  icon: ReactNode;
}

interface NavInertItem {
  key: string;
  label: string;
  icon: ReactNode;
}

const LINK_ITEMS: NavLinkItem[] = [
  { key: "profile", label: "Dados do perfil", to: "/profile", icon: <User /> },
  { key: "wallets", label: "Carteiras", to: "/wallets", icon: <WalletIcon /> },
  { key: "favorites", label: "Favoritos", to: "/favorites", icon: <Heart /> },
];

// §3: itens do Figma sem rota/contrato — visíveis porém inertes (`aria-disabled`, sem `href`).
const INERT_ITEMS: NavInertItem[] = [
  { key: "activity", label: "Atividade", icon: <Activity /> },
  { key: "offers", label: "Ofertas", icon: <Tag /> },
  { key: "downloads", label: "Arquivos baixados", icon: <Download /> },
  { key: "support", label: "Suporte", icon: <LifeBuoy /> },
];

function AccountSidebar({ active }: { active: AccountSection }) {
  return (
    <nav
      aria-label="Conta"
      className="flex w-full flex-col gap-1 rounded-md bg-surface-card py-2 lg:w-[310px] lg:shrink-0"
    >
      {/* Mobile/tablet (A6): nav horizontal rolável no topo; desktop: título + coluna vertical. */}
      <h2 className="hidden px-4 py-2 text-body-lg font-bold text-foreground lg:block">
        Meu perfil
      </h2>

      <ul className="flex gap-1 overflow-x-auto px-2 py-1 lg:flex-col lg:gap-0 lg:overflow-visible lg:px-0 lg:py-0">
        {LINK_ITEMS.map((item) => {
          const isActive = item.key === active;
          return (
            <li key={item.key} className="shrink-0 lg:shrink">
              <Link
                to={item.to}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-4 whitespace-nowrap rounded-md px-4 py-2.5 text-body text-accent-text transition-colors [&_svg]:size-[18px] lg:rounded-none lg:border-l lg:border-transparent lg:px-4 lg:py-[13px]",
                  isActive && "font-bold lg:border-primary",
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            </li>
          );
        })}

        {/* Itens inertes (A2/§3): sinalizam escopo não-funcional. Só no desktop — no mobile não há
            frame Figma e a nav horizontal fica só com os 3 links reais (A6). `aria-disabled` sem
            `tabIndex` → não-navegáveis e não-focáveis como ação (M1). */}
        {INERT_ITEMS.map((item) => (
          <li key={item.key} className="hidden shrink-0 lg:block">
            <span
              aria-disabled="true"
              className="flex cursor-not-allowed items-center gap-4 whitespace-nowrap px-4 py-[13px] text-body text-secondary/60 [&_svg]:size-[18px]"
            >
              {item.icon}
              {item.label}
              <span className="sr-only"> (indisponível)</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mx-4 my-2 hidden border-t border-primary/30 lg:block" />

      <button
        type="button"
        onClick={() => void signOut()}
        className="mx-2 flex items-center gap-2 whitespace-nowrap rounded-md px-4 py-2.5 text-left text-body font-bold text-accent-text transition-colors hover:bg-surface-raised lg:mx-0 lg:rounded-none [&_svg]:size-[18px]"
      >
        <LogOut />
        Sair
      </button>
    </nav>
  );
}
