import type { CashMovement, JournalEntry, Strategy, Trade, UserSettings } from "@/lib/domain/types";
import type { AuditEvent } from "@/lib/security";
import { notify } from "../notices";
import { openPersistence, type Persistence, type PersistenceMode } from "./persistence";

export interface Account {
  id: string;
  name: string;
  email: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
  example?: boolean;
  /* Security fields (absent in data saved by older versions of the demo). */
  failedLoginCount?: number;
  lockedUntil?: string | null;
  lastLoginAt?: string | null;
  passwordChangedAt?: string | null;
}

type Owned<T> = T & { accountId: string };

export interface DemoState {
  version: 1;
  session: string | null;
  /** When the current sign-in started (the demo has a single browser session). */
  sessionStartedAt?: string;
  sessionLastSeenAt?: string;
  /** Short fingerprint shown in the sessions list. */
  sessionId?: string;
  accounts: Account[];
  settings: Record<string, UserSettings>;
  trades: Owned<Trade>[];
  cash: Owned<CashMovement>[];
  strategies: Owned<Strategy>[];
  journal: Owned<JournalEntry>[];
  audit?: Owned<AuditEvent>[];
}

export const emptyState = (): DemoState => ({
  version: 1,
  session: null,
  accounts: [],
  settings: {},
  trades: [],
  cash: [],
  strategies: [],
  journal: [],
  audit: [],
});

let state: DemoState = emptyState();
let persistence: Persistence | null = null;
let ready: Promise<void> | null = null;

export type SaveStatus = "idle" | "saving" | "saved" | "error";
let saveStatus: SaveStatus = "idle";
const statusListeners = new Set<() => void>();
const setStatus = (s: SaveStatus) => {
  saveStatus = s;
  statusListeners.forEach((l) => l());
};
export const getSaveStatus = () => saveStatus;
export const subscribeSaveStatus = (cb: () => void) => {
  statusListeners.add(cb);
  return () => statusListeners.delete(cb);
};
export const getPersistenceMode = (): PersistenceMode | null => persistence?.mode ?? null;

function isState(v: unknown): v is DemoState {
  const s = v as DemoState;
  return !!s && s.version === 1 && Array.isArray(s.accounts) && Array.isArray(s.trades) && typeof s.settings === "object";
}

/** Loads saved data once; every API call awaits this. */
export function initStore(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const { persistence: p, json, warning } = await openPersistence();
      persistence = p;
      if (json) {
        try {
          const parsed = JSON.parse(json);
          if (isState(parsed)) state = parsed;
        } catch {
          notify("Os dados salvos estavam ilegíveis e foram ignorados.", "warning");
        }
      }
      if (warning) notify(warning, "warning");
    })();
  }
  return ready;
}

export const getState = () => state;

let timer: number | null = null;
let saving = false;
let dirty = false;

async function flush() {
  if (!persistence) return;
  if (saving) {
    dirty = true;
    return;
  }
  saving = true;
  dirty = false;
  setStatus("saving");
  try {
    await persistence.save(JSON.stringify(state));
    setStatus("saved");
  } catch (err) {
    setStatus("error");
    const code = (err as { code?: string })?.code;
    notify(
      code === "quota_exceeded"
        ? "O espaço de armazenamento da demo acabou. Exclua operações ou apague os dados da demo."
        : "Não foi possível salvar as últimas alterações. Elas continuam na tela até você fechar a página.",
      "error",
    );
  } finally {
    saving = false;
    if (dirty) void flush();
  }
}

/** Applies a change and schedules a coalesced save. */
export function mutate(fn: (s: DemoState) => void) {
  fn(state);
  if (timer) window.clearTimeout(timer);
  setStatus("saving");
  timer = window.setTimeout(() => {
    timer = null;
    void flush();
  }, 350);
}

export function replaceState(next: DemoState) {
  mutate((s) => Object.assign(s, next));
}
