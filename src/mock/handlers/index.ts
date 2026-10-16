/** Composição de todos os handlers REST (ver mock.spec.md § Handlers). */
import { cartHandlers } from "./cart";
import { favoriteHandlers } from "./favorites";
import { nftHandlers } from "./nfts";
import { orderHandlers } from "./orders";
import { profileHandlers } from "./profile";
import { quoteHandlers } from "./quote";
import { sessionHandlers } from "./session";
import { walletHandlers } from "./wallets";

export const restHandlers = [
  ...sessionHandlers,
  ...nftHandlers,
  ...favoriteHandlers,
  ...cartHandlers,
  ...quoteHandlers,
  ...orderHandlers,
  ...profileHandlers,
  ...walletHandlers,
];
