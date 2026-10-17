import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { AppShell } from "@/app/shell";
import { NotFound } from "@/app/not-found";
import { RouteError } from "@/app/route-error";
import { PlaceholderPage } from "@/app/placeholder-page";
import { requireAuth } from "@/app/require-auth";
import { redirectIfAuthenticated } from "@/features/auth/guard";
import { LoginScreen, RegisterScreen } from "@/features/auth/auth-screens";

/** Search param de retorno ao fluxo (§3): para onde voltar após autenticar. */
interface AuthSearch {
  redirect?: string;
}

function validateAuthSearch(search: Record<string, unknown>): AuthSearch {
  // Sanitiza o `redirect` já na origem (defesa em profundidade anti open-redirect): só aceita um
  // caminho interno — começa com uma única "/". URLs absolutas e protocol-relative (`//host`) viram
  // `undefined`. Os consumos ainda passam por `safeInternalPath`.
  const raw = search.redirect;
  const redirect =
    typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//") ? raw : undefined;
  return { redirect };
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
  // Já autenticado não loga de novo → volta para o destino (spec §Roteamento, critério 5).
  beforeLoad: ({ search }) => redirectIfAuthenticated(search.redirect),
  component: LoginScreen,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  validateSearch: validateAuthSearch,
  beforeLoad: ({ search }) => redirectIfAuthenticated(search.redirect),
  component: RegisterScreen,
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
