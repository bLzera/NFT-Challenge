/**
 * Configuração de ambiente.
 *
 * Como o projeto não possui backend real, a camada de mock (MSW) é a fonte de
 * dados padrão — habilitada por padrão e desativável via `VITE_ENABLE_MOCKS=false`.
 * Mantê-la ativa também no build de produção é o que viabiliza o deploy estático
 * na Vercel (§6 e §12 do desafio).
 */
export const env = {
  /** Ativa a interceptação de rede do MSW (REST + Socket.IO). */
  enableMocks: import.meta.env.VITE_ENABLE_MOCKS !== "false",
  /** Modo de desenvolvimento do Vite. */
  isDev: import.meta.env.DEV,
} as const;
