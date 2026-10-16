/**
 * Usuários semeados (ver mock.spec.md § fixtures). ≥2 usuários com senha fictícia conhecida
 * (documentadas no README da solução, Fase 7). Cada um com perfil, carteiras e favoritos iniciais
 * distintos — base para exercitar isolamento por usuário (§7, eliminatório §11).
 */

export interface WalletFixture {
  id: string;
  label: string;
  address: string;
  network: string;
  role: "primary" | "secondary";
}

export interface UserFixture {
  id: string;
  email: string;
  /** Senha fictícia em claro apenas na fixture; o store guarda só o hash (`sha:<senha>`). */
  password: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: string;
  wallets: WalletFixture[];
  /** ids de NFT favoritados inicialmente (devem existir no catálogo). */
  favoriteNftIds: string[];
}

export const USER_FIXTURES: UserFixture[] = [
  {
    id: "user-collector",
    email: "collector@example.com",
    password: "password123",
    displayName: "Ava Collector",
    avatarUrl: "https://picsum.photos/seed/ava-collector/200/200",
    bio: "Colecionadora de arte generativa e glitch.",
    createdAt: "2026-01-04T10:00:00.000Z",
    wallets: [
      {
        id: "wallet-ava-1",
        label: "Carteira principal",
        address: "0xAVA0000000000000000000000000000000000001",
        network: "ethereum",
        role: "primary",
      },
      {
        id: "wallet-ava-2",
        label: "Fria (cold)",
        address: "0xAVA0000000000000000000000000000000000002",
        network: "polygon",
        role: "secondary",
      },
    ],
    favoriteNftIds: ["nft-001", "nft-013"],
  },
  {
    id: "user-trader",
    email: "trader@example.com",
    password: "password123",
    displayName: "Beto Trader",
    avatarUrl: "https://picsum.photos/seed/beto-trader/200/200",
    bio: "Flipando editions desde o bloco gênese.",
    createdAt: "2026-02-18T14:30:00.000Z",
    wallets: [
      {
        id: "wallet-beto-1",
        label: "Principal",
        address: "0xBET0000000000000000000000000000000000001",
        network: "ethereum",
        role: "primary",
      },
    ],
    favoriteNftIds: ["nft-007"],
  },
];
