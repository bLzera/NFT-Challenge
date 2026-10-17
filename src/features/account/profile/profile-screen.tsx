import { AccountLayout } from "../account-layout";
import { ErrorState, LoadingState, isRetryable, resolveApiRequestError } from "@/components/state";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useProfile } from "./use-profile";
import { ProfileForm } from "./profile-form";
import { ChangePasswordForm } from "./change-password-form";

/**
 * Tela `/profile` (A1): sidebar + dois forms independentes (A-profile-1) — "Salvar perfil"
 * (`updateProfile`) e "Alterar senha" (`changePassword`).
 */
export function ProfileScreen() {
  return (
    <AccountLayout active="profile">
      <ProfileContent />
    </AccountLayout>
  );
}

function ProfileContent() {
  const query = useProfile();

  if (query.isPending) {
    return <ProfileSkeleton />;
  }

  if (query.isError) {
    return (
      <ErrorState
        error={query.error}
        title="Não foi possível carregar seu perfil"
        onRetry={() => query.refetch()}
        retryable={isRetryable(resolveApiRequestError(query.error))}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <ProfileForm profile={query.data} />
      <Separator className="bg-primary/20" />
      <ChangePasswordForm />
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <LoadingState label="Carregando perfil…">
      <div className="flex flex-col gap-8">
        <Skeleton className="h-4 w-56" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[69px] w-full" />
          ))}
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
    </LoadingState>
  );
}
