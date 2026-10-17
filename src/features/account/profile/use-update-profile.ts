import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Profile, UpdateProfileRequest } from "@/contracts";
import { updateProfile } from "@/lib/http/api";
import { keys } from "@/lib/query/keys";

/**
 * Mutation "Salvar perfil" (A-profile-1): `PATCH /profile`. `retry: 0` — erro de validação não deve
 * reenviar sozinho. `onSuccess` adota o `Profile` autoritativo (com a `version` do servidor) no
 * cache e invalida para reconciliar qualquer leitor concorrente.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation<Profile, unknown, UpdateProfileRequest>({
    mutationFn: updateProfile,
    retry: 0,
    onSuccess: (profile) => {
      queryClient.setQueryData(keys.profile, profile);
      void queryClient.invalidateQueries({ queryKey: keys.profile });
    },
  });
}
