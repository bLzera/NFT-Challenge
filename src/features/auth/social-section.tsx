/**
 * Login social e "Esqueceu a senha?" — **fora de escopo** (spec §Fora de escopo, README §3). Não há
 * contrato para eles, então são renderizados conforme o Figma porém **não-funcionais**: `aria-disabled`,
 * foco mantido para leitores de tela, e sufixo `sr-only` anunciando a indisponibilidade. Nunca
 * aparentam sucesso.
 */

import type { ReactNode } from "react";

const UNAVAILABLE = " (indisponível nesta demonstração)";

/** Botão social inerte: focável para anúncio, mas sem ação (não simula autenticação). */
function SocialButton({ provider, icon }: { provider: string; icon: ReactNode }) {
  return (
    <button
      type="button"
      aria-disabled="true"
      onClick={(e) => e.preventDefault()}
      className="flex h-10 w-full cursor-not-allowed items-center justify-center gap-3 rounded-md border border-border bg-transparent text-caption font-medium text-secondary opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span aria-hidden="true" className="flex items-center">
        {icon}
      </span>
      Continuar com {provider}
      <span className="sr-only">{UNAVAILABLE}</span>
    </button>
  );
}

export function ForgotPasswordLink() {
  return (
    <div className="flex justify-end">
      <button
        type="button"
        aria-disabled="true"
        onClick={(e) => e.preventDefault()}
        className="cursor-not-allowed rounded-sm text-body text-accent-text opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Esqueceu a senha?
        <span className="sr-only">{UNAVAILABLE}</span>
      </button>
    </div>
  );
}

export function SocialSection() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-caption text-foreground">Ou continue com</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <SocialButton provider="Google" icon={<GoogleGlyph />} />
      <SocialButton provider="Facebook" icon={<FacebookGlyph />} />
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" role="presentation">
      <path
        fill="#4086F4"
        d="M23.52 12.27c0-.82-.07-1.6-.2-2.36H12v4.46h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.72Z"
      />
      <path
        fill="#59C36A"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.88-3a7.2 7.2 0 0 1-4.06 1.15 7.14 7.14 0 0 1-6.7-4.93H1.28v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FFDA2D"
        d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6v-3.1H1.28a12 12 0 0 0 0 10.8l4.02-3.1Z"
      />
      <path
        fill="#FF641A"
        d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.28 6.6l4.02 3.1A7.14 7.14 0 0 1 12 4.77Z"
      />
    </svg>
  );
}

function FacebookGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" role="presentation">
      <path
        fill="#3B5999"
        d="M24 12a12 12 0 1 0-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.67 4.53-4.67 1.31 0 2.68.24 2.68.24v2.95h-1.51c-1.49 0-1.95.92-1.95 1.87V12h3.32l-.53 3.47h-2.79v8.38A12 12 0 0 0 24 12Z"
      />
    </svg>
  );
}
