import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import { fieldErrors } from "@/lib/validation/schemas";
import { getCurrentUser, type AuthUser } from "@/server/auth/session";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const json = <T>(data: T, init?: ResponseInit) => NextResponse.json(data, init);

const MAX_JSON_BYTES = 12 * 1024 * 1024;

/** Rejects cross-site state-changing requests (defence in depth on top of SameSite cookies). */
export function assertSameOrigin(request: Request) {
  if (request.method === "GET" || request.method === "HEAD") return;
  const origin = request.headers.get("origin");
  if (!origin) return;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    if (new URL(origin).host !== host) throw new ApiError(403, "Origem da requisição não permitida.");
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(403, "Origem da requisição inválida.");
  }
}

export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new ApiError(415, "Envie os dados em JSON.");
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_JSON_BYTES) throw new ApiError(413, "Requisição muito grande.");
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "JSON inválido.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw parsed.error;
  return parsed.data;
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Sessão expirada. Entre novamente.");
  return user;
}

type Handler<C> = (request: NextRequest, context: C) => Promise<Response>;

/** Wraps a route handler with origin checks and uniform error responses. */
export function route<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (request, context) => {
    try {
      assertSameOrigin(request);
      return await handler(request, context);
    } catch (err) {
      if (err instanceof ZodError) {
        const fields = fieldErrors(err);
        const first = Object.values(fields)[0] ?? "Dados inválidos.";
        return json({ error: first, fields }, { status: 422 });
      }
      if (err instanceof ApiError) {
        return json({ error: err.message, fields: err.fields }, { status: err.status });
      }
      console.error("[api]", request.method, request.nextUrl.pathname, err);
      return json({ error: "Erro interno. Tente novamente em instantes." }, { status: 500 });
    }
  };
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

export type IdContext = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function idParam(ctx: IdContext): Promise<string> {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) throw new ApiError(404, "Registro não encontrado.");
  return id;
}
