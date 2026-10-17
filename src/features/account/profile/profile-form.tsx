import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Profile, UpdateProfileRequest } from "@/contracts";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { applyFieldErrors } from "../apply-field-errors";
import { profileFormSchema, type ProfileFormValues } from "./profile-schemas";
import { AvatarField } from "./avatar-field";
import { useUpdateProfile } from "./use-update-profile";

/**
 * Form "Salvar perfil" (A-profile-1): `displayName`/`bio`/`avatarUrl` via `updateProfile` — um único
 * request (A-profile-3). E-mail é exibido fora deste form, read-only (A-profile-2).
 */
export function ProfileForm({ profile }: { profile: Profile }) {
  const updateProfile = useUpdateProfile();
  const {
    register,
    handleSubmit,
    control,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: profile.displayName,
      bio: profile.bio ?? "",
      avatarUrl: profile.avatarUrl ?? "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    clearErrors();
    const body: UpdateProfileRequest = {
      displayName: values.displayName,
      bio: values.bio || undefined,
      avatarUrl: values.avatarUrl || undefined,
    };
    updateProfile.mutate(body, {
      onSuccess: () => toast.success("Perfil atualizado."),
      onError: (error) =>
        applyFieldErrors<ProfileFormValues>(error, {
          setError,
          knownFields: ["displayName", "bio", "avatarUrl"],
        }),
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <h2 className="text-body-lg font-bold text-foreground">Perfil do colecionador</h2>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <FormField label="Nome de exibição" required error={errors.displayName?.message}>
          {(field) => (
            <Input
              {...register("displayName")}
              id={field.id}
              placeholder="Seu nome de exibição"
              aria-describedby={field.describedBy}
              aria-invalid={field.invalid}
              aria-required="true"
            />
          )}
        </FormField>

        <FormField label="E-mail">
          {(field) => (
            <Input
              id={field.id}
              value={profile.email}
              disabled
              readOnly
              aria-readonly="true"
              aria-describedby={field.describedBy}
            />
          )}
        </FormField>
      </div>

      <FormField label="Bio" error={errors.bio?.message}>
        {(field) => (
          <textarea
            {...register("bio")}
            id={field.id}
            rows={4}
            placeholder="Conte um pouco sobre você como colecionador."
            aria-describedby={field.describedBy}
            aria-invalid={field.invalid}
            className="w-full rounded-[3px] border border-border bg-transparent p-3 text-label text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        )}
      </FormField>

      <Controller
        name="avatarUrl"
        control={control}
        render={({ field }) => (
          <AvatarField
            value={field.value ?? ""}
            onChange={field.onChange}
            error={errors.avatarUrl?.message}
          />
        )}
      />

      {errors.root && (
        <p role="alert" className="text-caption text-destructive">
          {errors.root.message}
        </p>
      )}

      <Button
        type="submit"
        disabled={updateProfile.isPending}
        aria-busy={updateProfile.isPending}
        className="w-fit"
      >
        {updateProfile.isPending ? "Salvando…" : "Salvar perfil"}
      </Button>
    </form>
  );
}
