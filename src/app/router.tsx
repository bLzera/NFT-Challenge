import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { AppShell } from "@/app/shell";
import { NotFound } from "@/app/not-found";
import { RouteError } from "@/app/route-error";
import { PlaceholderPage } from "@/app/placeholder-page";
import { requireAuth } from "@/app/require-auth";

/** Search param de retorno ao fluxo (§3): para onde voltar após autenticar. */
interface AuthSearch {
  redirect?: string;
}

function validateAuthSearch(search: Record<string, unknown>): AuthSearch {
  return { redirect: typeof search.redirect === "string" ? search.redirect : undefined };
}

const rootRoute = createRootRoute({
  component: AppShell,
  notFoundComponent: NotFound,
  errorComponent: RouteError,
});

/*
 * Esqueleto de rotas da Fase 4. A `foundation` registra todas para que os links tipados do
 * header/features compilem e para exercitar 404/guarda; cada feature troca o `component` da sua
 * rota pela implementação real. Rotas privadas (§3) usam `beforeLoad: requireAuth`.
 */

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => (
    <PlaceholderPage title="Catálogo" description="A descoberta de NFTs chega na feature `catalog`." />
  ),
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  validateSearch: validateAuthSearch,
  component: () => <PlaceholderPage title="Entrar" description="Login chega na feature `auth`." />,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  validateSearch: validateAuthSearch,
  component: () => (
    <PlaceholderPage title="Criar conta" description="Cadastro chega na feature `auth`." />
  ),
});

const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cart",
  component: () => <PlaceholderPage title="Carrinho" />,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  beforeLoad: ({ location }) => requireAuth(location.href),
  component: () => <PlaceholderPage title="Perfil" />,
});

const walletsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/wallets",
  beforeLoad: ({ location }) => requireAuth(location.href),
  component: () => <PlaceholderPage title="Carteiras" />,
});

const favoritesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/favorites",
  beforeLoad: ({ location }) => requireAuth(location.href),
  component: () => <PlaceholderPage title="Favoritos" />,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  cartRoute,
  profileRoute,
  walletsRoute,
  favoritesRoute,
]);

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
