import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { CreateWalletRequest, UpdateWalletRequest, Wallet } from "@/contracts";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { applyFieldErrors } from "../apply-field-errors";
import { availableNetworks, walletFormSchema, type WalletFormValues } from "./wallet-schemas";
import { useCreateWallet } from "./use-create-wallet";
import { useUpdateWallet } from "./use-update-wallet";

interface WalletFormProps {
  /** Carteira em edição (A-wallets-4); ausente → modo cadastro. */
  editingWallet: Wallet | undefined;
  existingNetworks: string[];
  onDone: () => void;
}

const DEFAULT_VALUES: WalletFormValues = {
  label: "",
  address: "",
  network: "ethereum",
  role: "secondary",
};

/** Form de cadastro/edição de carteira (A-wallets-4): mesmo form, `createWallet`/`updateWallet`. */
export function WalletForm({ editingWallet, existingNetworks, onDone }: WalletFormProps) {
  const createWallet = useCreateWallet();
  const updateWallet = useUpdateWallet();
  const isEditing = Boolean(editingWallet);
  const isPending = createWallet.isPending || updateWallet.isPending;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<WalletFormValues>({
    resolver: zodResolver(walletFormSchema),
    defaultValues: editingWallet
      ? {
          label: editingWallet.label,
          address: editingWallet.address,
          network: editingWallet.network,
          role: editingWallet.role,
        }
      : DEFAULT_VALUES,
  });

  useEffect(() => {
    reset(
      editingWallet
        ? {
            label: editingWallet.label,
            address: editingWallet.address,
            network: editingWallet.network,
            role: editingWallet.role,
          }
        : DEFAULT_VALUES,
    );
  }, [editingWallet, reset]);

  const networkOptions = availableNetworks(existingNetworks);

  const onSubmit = handleSubmit((values) => {
    clearErrors();

    if (editingWallet) {
      const body: UpdateWalletRequest = values;
      updateWallet.mutate(
        { walletId: editingWallet.id, body },
        {
          onSuccess: () => {
            toast.success("Carteira atualizada.");
            onDone();
          },
          onError: (error) =>
            applyFieldErrors<WalletFormValues>(error, {
              setError,
              knownFields: ["label", "address", "network", "role"],
            }),
        },
      );
      return;
    }

    const body: CreateWalletRequest = values;
    createWallet.mutate(body, {
      onSuccess: () => {
        toast.success("Carteira cadastrada.");
        reset(DEFAULT_VALUES);
        onDone();
      },
      onError: (error) =>
        applyFieldErrors<WalletFormValues>(error, {
          setError,
          knownFields: ["label", "address", "network", "role"],
        }),
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6" data-testid="wallet-form">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <FormField label="Nome de exibição / Apelido" required error={errors.label?.message}>
          {(field) => (
            <Input
              {...register("label")}
              id={field.id}
              placeholder="Ex.: Carteira principal"
              aria-describedby={field.describedBy}
              aria-invalid={field.invalid}
              aria-required="true"
            />
          )}
        </FormField>

        <FormField label="Endereço da carteira" required error={errors.address?.message}>
          {(field) => (
            <Input
              {...register("address")}
              id={field.id}
              placeholder="Endereço 0x da carteira"
              aria-describedby={field.describedBy}
              aria-invalid={field.invalid}
              aria-required="true"
            />
          )}
        </FormField>

        <FormField label="Rede" required error={errors.network?.message}>
          {(field) => (
            <select
              {...register("network")}
              id={field.id}
              aria-describedby={field.describedBy}
              aria-invalid={field.invalid}
              aria-required="true"
              className="h-10 w-full rounded-[3px] border border-border bg-transparent px-3 text-label text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {networkOptions.map((network) => (
                <option key={network} value={network}>
                  {network}
                </option>
              ))}
            </select>
          )}
        </FormField>

        <FormField label="Tipo de carteira" required error={errors.role?.message}>
          {(field) => (
            <select
              {...register("role")}
              id={field.id}
              aria-describedby={field.describedBy}
              aria-invalid={field.invalid}
              aria-required="true"
              className="h-10 w-full rounded-[3px] border border-border bg-transparent px-3 text-label text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="primary">Principal</option>
              <option value="secondary">Secundária</option>
            </select>
          )}
        </FormField>
      </div>

      {errors.root && (
        <p role="alert" className="text-caption text-destructive">
          {errors.root.message}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending} aria-busy={isPending} className="w-fit">
          {isPending ? "Salvando…" : "Salvar carteira"}
        </Button>
        {isEditing && (
          <Button type="button" variant="outline" onClick={onDone} disabled={isPending}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
