import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { AppProviders } from "@/app/providers";
import { env } from "@/config/env";
import { bootSession, initDataLayer } from "@/lib/auth/session";

async function bootstrap() {
  if (env.enableMocks) {
    const { enableMocks } = await import("@/mock/enable");
    await enableMocks();
  }

  // Camada de dados (Fase 3): interceptors/realtime instalados e sessão revalidada a partir do
  // token salvo ANTES do primeiro render — recuperação de sessão pós-refresh.
  initDataLayer();
  await bootSession();

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <AppProviders />
    </StrictMode>,
  );
}

void bootstrap();
