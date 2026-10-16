import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { AppProviders } from "@/app/providers";
import { env } from "@/config/env";

async function bootstrap() {
  if (env.enableMocks) {
    const { enableMocks } = await import("@/mock/enable");
    await enableMocks();
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <AppProviders />
    </StrictMode>,
  );
}

void bootstrap();
