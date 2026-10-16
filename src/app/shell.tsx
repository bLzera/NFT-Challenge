import { Link, Outlet } from "@tanstack/react-router";

/**
 * Shell da aplicação: cabeçalho persistente + área de conteúdo roteada.
 * O layout definitivo (header do Figma, navegação, carrinho) é desenvolvido
 * na Fase 4; aqui ficam apenas a casca e o ponto de montagem das rotas.
 */
export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="font-semibold tracking-tight">
            NFT Marketplace
          </Link>
          <nav aria-label="Navegação principal" className="text-sm text-muted-foreground">
            {/* Links de navegação entram na Fase 4 */}
          </nav>
        </div>
      </header>
      <main className="container flex-1 py-8">
        <Outlet />
      </main>
    </div>
  );
}
