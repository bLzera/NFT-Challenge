import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@/lib/http/api";
import { keys } from "@/lib/query/keys";

/**
 * Leitura do perfil (spec account §Tela 1). A rota `/profile` já é privada (`requireAuth` no
 * `beforeLoad`), então o `enabled` default do `useQuery` é suficiente — nenhuma condição extra.
 */
export function useProfile() {
  return useQuery({
    queryKey: keys.profile,
    queryFn: getProfile,
  });
}
