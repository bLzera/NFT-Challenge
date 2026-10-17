import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";

interface AvatarFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  describedById?: string;
}

/**
 * Campo de avatar por URL (A-profile-3): preview circular + input de URL. Sem upload de arquivo —
 * `updateProfile`/`updateAvatar` aceitam só `avatarUrl: string`. "Remover" limpa o campo (envia
 * `avatarUrl` vazio/omitido no submit).
 */
export function AvatarField({ value, onChange, error }: AvatarFieldProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
      <div
        className="flex size-[50px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-raised text-caption text-muted-foreground"
        aria-hidden="true"
      >
        {value ? (
          <img src={value} alt="" className="size-full object-cover" />
        ) : (
          <span>Sem foto</span>
        )}
      </div>

      <div className="flex-1">
        <FormField label="Avatar (URL)" error={error} hint="Cole a URL de uma imagem. Sem upload de arquivo.">
          {(field) => (
            <div className="flex gap-2">
              <Input
                id={field.id}
                type="url"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="https://..."
                aria-describedby={field.describedBy}
                aria-invalid={field.invalid}
                className="flex-1"
              />
              {value && (
                <button
                  type="button"
                  onClick={() => onChange("")}
                  className="shrink-0 whitespace-nowrap text-body-sm font-bold text-accent-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Remover
                </button>
              )}
            </div>
          )}
        </FormField>
      </div>
    </div>
  );
}
