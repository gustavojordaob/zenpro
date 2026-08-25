/**
 * Cache em memória + sessionStorage com TTL e dedupe de requests em voo.
 * Evita N× getDocs iguais na home (categorias, header, promoções).
 */

type CacheEntry<T> = { expires: number; value: T };

const memory = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

const STORAGE_PREFIX = "zenpro:ttl:";

/** Catálogo / campanhas / marcas — 3 min */
export const TTL_CATALOGO_MS = 3 * 60 * 1000;
/** Estoque — 1 min (muda mais que o cardápio) */
export const TTL_ESTOQUE_MS = 60 * 1000;

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

function readSession<T>(key: string): CacheEntry<T> | null {
  if (!canUseSessionStorage()) return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || typeof parsed.expires !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSession<T>(key: string, entry: CacheEntry<T>): void {
  if (!canUseSessionStorage()) return;
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch {
    /* quota / private mode */
  }
}

export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts?: { ttlMs?: number; persist?: boolean },
): Promise<T> {
  const ttlMs = opts?.ttlMs ?? TTL_CATALOGO_MS;
  const persist = opts?.persist !== false;
  const now = Date.now();

  const mem = memory.get(key) as CacheEntry<T> | undefined;
  if (mem && mem.expires > now) return mem.value;

  if (persist) {
    const stored = readSession<T>(key);
    if (stored && stored.expires > now) {
      memory.set(key, stored);
      return stored.value;
    }
  }

  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const promise = (async () => {
    try {
      const value = await fetcher();
      const entry: CacheEntry<T> = { expires: Date.now() + ttlMs, value };
      memory.set(key, entry);
      if (persist) writeSession(key, entry);
      return value;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

/** Invalida entradas (prefixo opcional). Sem prefixo = limpa tudo. */
export function invalidateTtlCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    memory.clear();
    inflight.clear();
    if (canUseSessionStorage()) {
      const toRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k?.startsWith(STORAGE_PREFIX)) toRemove.push(k);
      }
      toRemove.forEach((k) => sessionStorage.removeItem(k));
    }
    return;
  }

  for (const k of [...memory.keys()]) {
    if (k.startsWith(keyPrefix)) memory.delete(k);
  }
  for (const k of [...inflight.keys()]) {
    if (k.startsWith(keyPrefix)) inflight.delete(k);
  }
  if (canUseSessionStorage()) {
    const toRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(STORAGE_PREFIX + keyPrefix)) toRemove.push(k);
    }
    toRemove.forEach((k) => sessionStorage.removeItem(k));
  }
}
