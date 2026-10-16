import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { AppShell } from "@/app/shell";

const rootRoute = createRootRoute({
  component: AppShell,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePlaceholder,
});

function HomePlaceholder() {
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Fundações prontas</h1>
      <p className="text-muted-foreground">
        Stack, roteamento, cache e camada de mock inicializados. Os fluxos entram
        a partir da Fase 4.
      </p>
    </section>
  );
}

const routeTree = rootRoute.addChildren([indexRoute]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
