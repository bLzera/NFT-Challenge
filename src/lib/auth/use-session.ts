import { useQuery } from "@tanstack/react-query";
import type { Session } from "@/contracts";
import { getSession } from "@/lib/http/api";
import { getToken } from "@/lib/http/token-store";
import { keys } from "@/lib/query/keys";

/**
 * Leitura reativa da sessão a partir do cache (fonte única `keys.session`). A sessão é populada no
 * bootstrap (`bootSession`) e mantida por `signIn`/`signOut`/401 via `setQueryData`; este hook apenas
 * **lê e assina** — só dispara fetch se houver token e o cache estiver vazio (tolerante). Consumido
 * pelo header (slot de conta) e por quem precisar derivar estado de autenticação na UI.
 */
export function useSession() {
  const query = useQuery<Session | null>({
    queryKey: keys.session,
    queryFn: getSession,
    enabled: Boolean(getToken()),
    staleTime: Infinity,
  });
  return {
    session: query.data ?? null,
    isAuthenticated: Boolean(query.data),
    isPending: query.isPending,
  };
}
