import { useSyncExternalStore } from "react";

/** Hash router for the standalone build: each screen is a plain `#name`. */
export const APP_ROUTES = [
  "dashboard",
  "monitoramento",
  "operacoes",
  "banca",
  "risco",
  "estatisticas",
  "calendario",
  "diario",
  "metas",
  "relatorios",
  "seguranca",
  "configuracoes",
] as const;
export const PUBLIC_ROUTES = ["login", "cadastro"] as const;
/** Settings tabs write their own `#name`; they still belong to the settings screen. */
const SETTINGS_TABS = ["perfil", "preferencias", "ativos", "estrategias", "dados"];
const ALL = new Set<string>([...APP_ROUTES, ...PUBLIC_ROUTES]);

function parse(hash: string): string {
  const name = hash.replace(/^#/, "");
  if (ALL.has(name)) return name;
  if (SETTINGS_TABS.includes(name)) return "configuracoes";
  return "";
}

let current = typeof window === "undefined" ? "" : parse(window.location.hash);
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("hashchange", () => {
    const next = parse(window.location.hash);
    if (next && next !== current) {
      current = next;
      emit();
    }
  });
}

export function routeName(path: string): string {
  return path.replace(/^[/#]+/, "").split(/[?#]/)[0] || "dashboard";
}

export function navigate(path: string) {
  const name = routeName(path);
  if (window.location.hash.slice(1) !== name) window.location.hash = name;
  if (current !== name) {
    current = name;
    emit();
  }
}

export function getRoute() {
  return current;
}

export function useRoute(): string {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => "",
  );
}
