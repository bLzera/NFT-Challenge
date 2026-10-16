/**
 * Erro de domínio lançado pelo store/handlers, carregando um `ApiError` tipado (Fase 1).
 * Os handlers capturam e traduzem para `HttpResponse` com o status de `ERROR_STATUS`.
 */
import type { ApiError, ConflictReason } from "@/contracts";

export class MockError extends Error {
  constructor(public readonly body: ApiError) {
    super(body.message);
    this.name = "MockError";
  }
}

export const errors = {
  validation(fields: Record<string, string[]>, message = "Dados inválidos."): MockError {
    return new MockError({ code: "validation", message, fields });
  },
  unauthenticated(message = "Sessão ausente ou expirada."): MockError {
    return new MockError({ code: "unauthenticated", message });
  },
  forbidden(message = "Sem permissão para este recurso."): MockError {
    return new MockError({ code: "forbidden", message });
  },
  notFound(resource: string, message = "Recurso não encontrado."): MockError {
    return new MockError({ code: "not_found", message, resource });
  },
  conflict(reason: ConflictReason, message = "Conflito de estado."): MockError {
    return new MockError({ code: "conflict", message, reason });
  },
  transient(message = "Falha transitória, tente novamente."): MockError {
    return new MockError({ code: "transient", message, retryable: true });
  },
};
