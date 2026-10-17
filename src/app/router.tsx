import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { listNftsQuerySchema, type ListNftsQuery } from "@/contracts";
import { AppShell } from "@/app/shell";
import { NotFound } from "@/app/not-found";
import { RouteError } from "@/app/route-error";
import { PlaceholderPage } from "@/app/placeholder-page";
import { requireAuth } from "@/app/require-auth";
import { redirectIfAuthenticated } from "@/features/auth/guard";
import { LoginScreen, RegisterScreen } from "@/features/auth/auth-screens";
import { CatalogScreen } from "@/features/catalog/catalog-screen";
import { NftDetailScreen } from "@/features/nft-detail/nft-detail-screen";
import { CartScreen } from "@/features/cart/cart-screen";

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
  // Reaproveita `listNftsQuerySchema` (parse parcial) como fonte única do shape de busca (catalog
  // spec §Roteamento): normaliza/coage (page/pageSize string→number, sort default) sem redeclarar
  // os campos. Chaves ausentes/"" ficam fora do objeto resultante, casando com `normalizeNftQuery`.
  // Tipo de retorno anotado como `Partial`: em runtime o schema sempre preenche os defaults
  // (`page`/`pageSize`/`sort`), mas marcá-los opcionais no tipo permite `<Link to="/">` sem exigir
  // `search` explícito em todo lugar (ex.: header, 404) — mesmo padrão usado por `/login`/`/register`.
  validateSearch: (search: Record<string, unknown>): Partial<ListNftsQuery> =>
    listNftsQuerySchema.parse(search),
  component: CatalogScreen,
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
  // Pública (A1 do cart.spec.md): visitante monta o carrinho sem sessão; o gate fica no checkout.
  component: CartScreen,
});

/**
 * `/checkout` registrada agora como placeholder privado (A2 do cart.spec.md), mesmo padrão de
 * `/nft`: o CTA de checkout da `cart` precisa de um `Link` tipado já existente. A feature
 * `checkout` troca só o `component` depois, sem recriar a rota.
 */
const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/checkout",
  beforeLoad: ({ location }) => requireAuth(location.href),
  component: () => <PlaceholderPage title="Pagamento" />,
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

/**
 * Rota de detalhe do NFT (A1 do `nft-detail.spec.md`): registrada originalmente pela `catalog`
 * como esqueleto (`PlaceholderPage`) para que os cards tivessem um `Link` tipado de verdade; a
 * feature `nft-detail` troca o `component` pela implementação real, sem recriar a rota. Pública —
 * ações que exigem sessão (favoritar/comprar) são gated dentro da tela.
 */
const nftDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/nft/$idOrSlug",
  component: NftDetailScreen,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  cartRoute,
  checkoutRoute,
  profileRoute,
  walletsRoute,
  favoritesRoute,
  nftDetailRoute,
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
