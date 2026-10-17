import { Toaster as SonnerToaster } from "sonner";

/**
 * Toaster acessível (sonner) para feedback de mutations e de eventos em tempo real (§8). Montado
 * uma vez no shell. Tema fixo em dark; cores alinhadas aos tokens via `toastOptions`.
 */
function Toaster(props: React.ComponentProps<typeof SonnerToaster>) {
  return (
    <SonnerToaster
      theme="dark"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "group border border-border bg-card text-card-foreground rounded-md text-label shadow-lg",
          description: "text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-secondary text-secondary-foreground",
          error: "border-destructive",
          success: "border-success",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
