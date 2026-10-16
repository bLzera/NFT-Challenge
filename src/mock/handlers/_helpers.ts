/**
 * Utilitários compartilhados pelos handlers REST (ver mock.spec.md § Handlers).
 * Pipeline comum: aplicar cenário (latência/falha) → validar (Zod) → auth guard → store → resposta.
 * Nenhuma resposta fictícia nasce fora daqui (critério eliminatório §11).
 */
import { HttpResponse, type HttpResponseResolver } from "msw";
import { z, ZodError } from "zod";
import { ERROR_STATUS, type UserId } from "@/contracts";
import { errors, MockError } from "@/mock/http-error";
import { store } from "@/mock/store";
import { applyRoute, NetworkError } from "@/mock/scenarios/apply";
import type { RouteKey } from "@/mock/scenarios/routes";

/** Deriva `fields: { path: string[] }` de um ZodError (contrato de erro `validation`). */
function fieldsFromZod(err: ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_";
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}

/** Traduz qualquer erro lançado no handler para uma resposta HTTP coerente. */
function toResponse(e: unknown): Response {
  if (e instanceof NetworkError) return HttpResponse.error();
  if (e instanceof MockError) {
    return HttpResponse.json(e.body, { status: ERROR_STATUS[e.body.code] });
  }
  if (e instanceof ZodError) {
    const body = errors.validation(fieldsFromZod(e)).body;
    return HttpResponse.json(body, { status: ERROR_STATUS.validation });
  }
  // falha inesperada → transitória (não vaza stack)
  const body = errors.transient().body;
  return HttpResponse.json(body, { status: ERROR_STATUS.transient });
}

/**
 * Envolve um resolver MSW: aplica o cenário da rota e captura erros em respostas tipadas.
 * Uso: `http.get(path, guarded("nfts.get", async ({ params }) => ...))`.
 */
export function guarded(route: RouteKey, fn: HttpResponseResolver): HttpResponseResolver {
  return async (info) => {
    try {
      await applyRoute(route);
      return await fn(info);
    } catch (e) {
      return toResponse(e);
    }
  };
}

export function bearer(request: Request): string | null {
  const header = request.headers.get("Authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

/** Exige sessão válida; lança `unauthenticated` caso contrário. */
export function requireUser(request: Request): UserId {
  const userId = store.resolveUser(bearer(request));
  if (!userId) throw errors.unauthenticated();
  return userId;
}

/** Lê e valida o corpo JSON; ZodError vira resposta `validation`. */
export async function parseBody<S extends z.ZodType>(schema: S, request: Request): Promise<z.infer<S>> {
  const raw = await request.json().catch(() => ({}));
  return schema.parse(raw);
}

/** Valida os search params da URL contra um schema (coerção de strings vive no schema). */
export function parseQuery<S extends z.ZodType>(schema: S, url: string): z.infer<S> {
  const params = Object.fromEntries(new URL(url).searchParams);
  return schema.parse(params);
}

/** Base de todas as rotas REST (decisão aprovada #1). */
export const API = "/api";

export { HttpResponse };
