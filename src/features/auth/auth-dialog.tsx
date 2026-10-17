import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { SocialSection } from "./social-section";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "register";

interface AuthDialogProps {
  mode: AuthMode;
  /** Destino de retorno preservado entre as abas e no fechamento. */
  redirect: string | undefined;
  /** Fecha o modal navegando para `redirect ?? "/"` (X, Esc, clique no overlay). */
  onClose: () => void;
  children: ReactNode;
}

const COPY: Record<AuthMode, { title: string; subtitle: string; crossLink: ReactNode }> = {
  login: {
    title: "Entrar",
    subtitle: "Entre para gerenciar sua carteira, coleção e perfil de criador.",
    crossLink: "Novo na Kurio? Crie uma conta",
  },
  register: {
    title: "Criar conta",
    subtitle: "Crie seu perfil de colecionador e conecte uma carteira quando quiser.",
    crossLink: "Já tem uma conta? Entre",
  },
};

/**
 * Apresentação compartilhada de `/login` e `/register` (A1/A3): modal centralizado (~500px) no
 * desktop, página full-screen no mobile (≤640). Acessibilidade de diálogo (foco preso, Esc,
 * `aria-modal`) vem do Radix/foundation. A aba ativa é o `DialogTitle` (nome acessível); a inativa é
 * um `Link` que **preserva `redirect`**. Fechar navega para o mesmo destino do pós-sucesso.
 */
export function AuthDialog({ mode, redirect, onClose, children }: AuthDialogProps) {
  const copy = COPY[mode];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "flex flex-col gap-6 overflow-y-auto",
          // Mobile (≤640): ocupa a tela inteira, sem borda/arredondamento.
          "max-sm:left-0 max-sm:top-0 max-sm:h-[100dvh] max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:border-0 max-sm:px-7 max-sm:pt-14",
          "sm:max-w-[500px]",
        )}
      >
        {/* Logo grande — só no mobile (Figma Mobile_*). */}
        <p
          aria-hidden="true"
          className="text-center text-display-sm font-bold tracking-[0.2em] text-foreground sm:hidden"
        >
          KURIO
        </p>

        <header className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-3">
            {mode === "login" ? (
              <DialogTitle className="text-accent-text">Entrar</DialogTitle>
            ) : (
              <Link
                to="/login"
                search={{ redirect }}
                className="text-title font-medium text-foreground/60 transition-colors hover:text-foreground"
              >
                Entrar
              </Link>
            )}
            <span aria-hidden="true" className="h-5 w-px bg-coral" />
            {mode === "register" ? (
              <DialogTitle className="text-accent-text">Criar conta</DialogTitle>
            ) : (
              <Link
                to="/register"
                search={{ redirect }}
                className="text-title font-medium text-foreground/60 transition-colors hover:text-foreground"
              >
                Criar conta
              </Link>
            )}
          </div>
          <DialogDescription className="max-w-xs text-foreground">
            {copy.subtitle}
          </DialogDescription>
        </header>

        {children}

        <SocialSection />

        <Link
          to={mode === "login" ? "/register" : "/login"}
          search={{ redirect }}
          className="text-center text-body text-accent-text hover:underline"
        >
          {copy.crossLink}
        </Link>
      </DialogContent>
    </Dialog>
  );
}
