/**
 * Standalone replacement for `@/lib/api/client`: requests are answered by the
 * in-browser engine instead of the network; files are offered through the
 * viewer's download prompt when available.
 */
import { buildDownload, handleRequest } from "../backend/api";
import { ApiClientError } from "../backend/errors";

export { ApiClientError };

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  try {
    return (await handleRequest(path, init)) as T;
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    console.error("[demo]", path, err);
    throw new ApiClientError(500, err instanceof Error ? err.message : "Erro inesperado.");
  }
}

interface DownloadsApi {
  save(req: { filename: string; data: Blob }): Promise<{ status: string }>;
}

let downloadsPromise: Promise<DownloadsApi | null> | null = null;
export function preloadDownloads() {
  if (!downloadsPromise) {
    downloadsPromise = window.claude?.use ? (window.claude.use("downloads") as Promise<DownloadsApi | null>).catch(() => null) : Promise.resolve(null);
  }
  return downloadsPromise;
}

const DOWNLOAD_ERRORS: Record<string, string> = {
  declined: "Download cancelado.",
  rate_limited: "Já existe um download aguardando confirmação. Tente de novo em instantes.",
  host_unavailable: "Este aplicativo não consegue salvar arquivos. Abra a página em um navegador ou computador.",
  too_large: "Arquivo grande demais para este destino.",
};

export async function downloadFile(path: string, fallbackName: string): Promise<void> {
  let file;
  try {
    file = await buildDownload(path);
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    throw new ApiClientError(500, err instanceof Error ? err.message : "Não foi possível gerar o arquivo.");
  }
  const blob = new Blob([file.data as BlobPart], { type: file.type });
  const downloads = await preloadDownloads();
  if (downloads) {
    try {
      await downloads.save({ filename: file.filename || fallbackName, data: blob });
      return;
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "unavailable";
      throw new ApiClientError(0, DOWNLOAD_ERRORS[code] ?? "Não foi possível salvar o arquivo neste visualizador.");
    }
  }
  if (window.top !== window.self) {
    throw new ApiClientError(0, "Este visualizador não permite baixar arquivos.");
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.filename || fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
