"use client";

export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

let redirecting = false;

async function handleUnauthorized() {
  if (redirecting || typeof window === "undefined") return;
  redirecting = true;
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } finally {
    const next = encodeURIComponent(window.location.pathname);
    window.location.assign(new URL(`/login?next=${next}`, window.location.origin).toString());
  }
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(path, {
      ...rest,
      headers: {
        ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
        Accept: "application/json",
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiClientError(0, "Sem conexão com o servidor. Verifique sua internet.");
  }
  if (res.status === 401 && !path.startsWith("/api/auth/")) {
    void handleUnauthorized();
    throw new ApiClientError(401, "Sessão expirada. Entre novamente.");
  }
  const contentType = res.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    throw new ApiClientError(res.status, body?.error ?? `Erro ${res.status}`, body?.fields ?? {});
  }
  return body as T;
}

/** Downloads a file from an authenticated GET endpoint. */
export async function downloadFile(path: string, fallbackName: string): Promise<void> {
  const res = await fetch(path, { credentials: "same-origin" });
  if (res.status === 401) {
    void handleUnauthorized();
    throw new ApiClientError(401, "Sessão expirada.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiClientError(res.status, body?.error ?? "Não foi possível gerar o arquivo.");
  }
  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = match?.[1] ?? fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
