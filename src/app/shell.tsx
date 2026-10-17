import { Outlet } from "@tanstack/react-router";
import { Header } from "@/app/header";
import { Footer } from "@/app/footer";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Shell da aplicação (rota raiz): header persistente + conteúdo roteado + rodapé. Monta os providers
 * de UI globais (tooltips e toaster acessível, §8). Dados do header (sessão/carrinho) vêm do cache,
 * não deste componente.
 */
export function AppShell() {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="container flex-1 py-8">
          <Outlet />
        </main>
        <Footer />
      </div>
      <Toaster />
    </TooltipProvider>
  );
}
