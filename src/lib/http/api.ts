/**
 * Funções de API tipadas por endpoint (ver data.spec.md § lib/http · api.ts).
 *
 * Espelham 1:1 os handlers REST da Fase 2 (base `/api`). Cada função chama a rede e **valida a
 * resposta** contra o schema de contrato correspondente (`@/contracts`): a borda de entrada do
 * cliente é tão estrita quanto a de saída do mock. Nenhuma fabricação de dado — só transporte +
 * validação. Login/registro persistem o token; logout o limpa.
 */
import {
  type AddCartItemRequest,
  type CreateOrderRequest,
  type CreateQuoteRequest,
  type CreateWalletRequest,
  type ChangePasswordRequest,
  type ListNftsQuery,
  type LoginRequest,
  type NftId,
  type OrderId,
  type RegisterRequest,
  type UpdateCartItemRequest,
  type UpdateProfileRequest,
  type UpdateWalletRequest,
  type WalletId,
  cartSchema,
  favoritesSchema,
  nftPageSchema,
  nftSchema,
  orderSchema,
  profileSchema,
  quoteSchema,
  sessionResponseSchema,
  sessionSchema,
  walletSchema,
} from "@/contracts";
import { z } from "zod";
import { http } from "./client";
import { clearToken, setToken } from "./token-store";

/** Executa a request e valida o corpo contra o schema; o erro já vem normalizado do interceptor. */
async function request<S extends z.ZodType>(
  schema: S,
  exec: () => Promise<{ data: unknown }>,
): Promise<z.infer<S>> {
  const { data } = await exec();
  return schema.parse(data);
}

/* ── Sessão e conta (§5) ────────────────────────────────────────────────── */

export async function register(body: RegisterRequest) {
  const session = await request(sessionSchema, () => http.post("/auth/register", body));
  setToken(session.token);
  return session;
}

export async function login(body: LoginRequest) {
  const session = await request(sessionSchema, () => http.post("/auth/login", body));
  setToken(session.token);
  return session;
}

export function getSession() {
  return request(sessionResponseSchema, () => http.get("/auth/session"));
}

export async function logout() {
  await http.post("/auth/logout");
  clearToken();
}

/* ── NFTs (§5) ──────────────────────────────────────────────────────────── */

export function listNfts(query: ListNftsQuery) {
  return request(nftPageSchema, () => http.get("/nfts", { params: query }));
}

export function getNft(idOrSlug: string) {
  return request(nftSchema, () => http.get(`/nfts/${encodeURIComponent(idOrSlug)}`));
}

/* ── Favoritos (§5) ─────────────────────────────────────────────────────── */

export function getFavorites() {
  return request(favoritesSchema, () => http.get("/favorites"));
}

export function toggleFavorite(nftId: NftId) {
  return request(favoritesSchema, () => http.post("/favorites", { nftId }));
}

/* ── Carrinho (§5) ──────────────────────────────────────────────────────── */

export function getCart() {
  return request(cartSchema, () => http.get("/cart"));
}

export function addCartItem(body: AddCartItemRequest) {
  return request(cartSchema, () => http.post("/cart/items", body));
}

export function updateCartItem(body: UpdateCartItemRequest) {
  return request(cartSchema, () => http.patch("/cart/items", body));
}

export function removeCartItem(nftId: NftId) {
  // DELETE com corpo: o handler lê `{ nftId }` do body.
  return request(cartSchema, () => http.delete("/cart/items", { data: { nftId } }));
}

/* ── Cotação (§5/§7) ────────────────────────────────────────────────────── */

export function createQuote(body: CreateQuoteRequest) {
  return request(quoteSchema, () => http.post("/quote", body));
}

/* ── Pedidos (§5/§7) ────────────────────────────────────────────────────── */

export function createOrder(body: CreateOrderRequest) {
  return request(orderSchema, () => http.post("/orders", body));
}

export function getOrder(orderId: OrderId) {
  return request(orderSchema, () => http.get(`/orders/${encodeURIComponent(orderId)}`));
}

/* ── Perfil (§5) ────────────────────────────────────────────────────────── */

export function getProfile() {
  return request(profileSchema, () => http.get("/profile"));
}

export function updateProfile(body: UpdateProfileRequest) {
  return request(profileSchema, () => http.patch("/profile", body));
}

export function updateAvatar(avatarUrl: string) {
  return request(profileSchema, () => http.put("/profile/avatar", { avatarUrl }));
}

export async function changePassword(body: ChangePasswordRequest) {
  await http.post("/profile/password", body);
}

/* ── Carteiras (§5) ─────────────────────────────────────────────────────── */

export function listWallets() {
  return request(z.array(walletSchema), () => http.get("/wallets"));
}

export function createWallet(body: CreateWalletRequest) {
  return request(walletSchema, () => http.post("/wallets", body));
}

export function updateWallet(walletId: WalletId, body: UpdateWalletRequest) {
  return request(walletSchema, () => http.patch(`/wallets/${encodeURIComponent(walletId)}`, body));
}
