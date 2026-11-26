/**
 * Where the standalone demo keeps its data.
 *
 * 1. "cloud"  — inside the Claude viewer, the artifact's private per-person
 *               store (`data/users/<id>/`): only the viewer can read it, and
 *               it survives across devices and visits.
 * 2. "local"  — browser storage (opened as a file, or the store is unavailable).
 * 3. "memory" — nothing persists (storage blocked).
 *
 * The whole demo state is one JSON document. In the cloud it is split into
 * chunks below the store's 256 KiB document limit and written as a new
 * "generation" before the pointer document flips, so a half-finished save
 * never corrupts the previous one.
 */

export type PersistenceMode = "cloud" | "local" | "memory";

export interface Persistence {
  mode: PersistenceMode;
  load(): Promise<string | null>;
  save(json: string): Promise<void>;
}

const LOCAL_KEY = "trading-desk-demo:v1";
const CHUNK_CHARS = 60_000; // ≤ 180 KB even if every char took 3 bytes
const TIMEOUT_MS = 10_000;

interface DocSnap {
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}
interface DocRef {
  get(): Promise<DocSnap>;
  set(data: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
}
interface DbApi {
  collection(path: string): { doc(id: string): DocRef };
}
interface UserApi {
  id(): Promise<string | null>;
}

function withTimeout<T>(p: Promise<T>, ms = TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => {
        window.clearTimeout(t);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(t);
        reject(e);
      },
    );
  });
}

async function cloudPersistence(): Promise<Persistence | null> {
  const runtime = window.claude;
  if (!runtime?.use) return null;
  const [db, user] = (await Promise.all([runtime.use("db"), runtime.use("user")])) as [DbApi | null, UserApi | null];
  if (!db || !user) return null;
  const uid = await user.id();
  if (!uid) return null;
  const col = db.collection(`data/users/${uid}`);
  let gen = 0;
  let counts: Record<string, number> = {};

  const load = async () => {
    const meta = await withTimeout(col.doc("meta").get());
    if (!meta.exists) return null;
    const m = meta.data() as { gen: number; n: number; counts?: Record<string, number> };
    gen = m.gen;
    counts = m.counts ?? { [`g${m.gen}`]: m.n };
    const parts = await withTimeout(Promise.all(Array.from({ length: m.n }, (_, i) => col.doc(`g${m.gen}-${i}`).get())));
    return parts.map((p) => String(p.data()?.d ?? "")).join("");
  };

  const save = async (json: string) => {
    const chunks: string[] = [];
    for (let i = 0; i < json.length; i += CHUNK_CHARS) chunks.push(json.slice(i, i + CHUNK_CHARS));
    if (!chunks.length) chunks.push("");
    const next = gen === 0 ? 1 : 0;
    // One write at a time keeps within the store's write budget.
    for (let i = 0; i < chunks.length; i++) await col.doc(`g${next}-${i}`).set({ d: chunks[i] });
    const stale = counts[`g${next}`] ?? 0;
    counts = { ...counts, [`g${next}`]: chunks.length };
    await col.doc("meta").set({ gen: next, n: chunks.length, counts, savedAt: new Date().toISOString(), v: 1 });
    gen = next;
    for (let i = chunks.length; i < stale; i++) await col.doc(`g${next}-${i}`).delete();
  };

  return { mode: "cloud", load, save };
}

function localPersistence(): Persistence | null {
  try {
    const probe = `${LOCAL_KEY}:probe`;
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
  } catch {
    return null;
  }
  return {
    mode: "local",
    load: async () => {
      try {
        return window.localStorage.getItem(LOCAL_KEY);
      } catch {
        return null;
      }
    },
    save: async (json) => {
      window.localStorage.setItem(LOCAL_KEY, json);
    },
  };
}

const memoryPersistence = (): Persistence => ({ mode: "memory", load: async () => null, save: async () => {} });

/** Picks the best available store and loads the saved state from it. */
export async function openPersistence(): Promise<{ persistence: Persistence; json: string | null; warning: string | null }> {
  try {
    const cloud = await withTimeout(cloudPersistence());
    if (cloud) {
      try {
        return { persistence: cloud, json: await cloud.load(), warning: null };
      } catch {
        const local = localPersistence() ?? memoryPersistence();
        return {
          persistence: local,
          json: await local.load(),
          warning: "Não foi possível acessar o armazenamento da sua conta agora. Os dados desta visita ficam neste navegador.",
        };
      }
    }
  } catch {
    // Viewer did not answer: fall through to browser storage.
  }
  const local = localPersistence();
  if (local) return { persistence: local, json: await local.load(), warning: null };
  return {
    persistence: memoryPersistence(),
    json: null,
    warning: "O armazenamento está bloqueado neste navegador: os dados serão perdidos ao fechar a página.",
  };
}
