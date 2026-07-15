/** Firestore rejeita `undefined` — normalizar para null ou omitir. */
export function valorFirestore<T>(value: T | undefined | null): T | null {
  return value === undefined ? null : value;
}

/** Valores especiais do Firestore (serverTimestamp, etc.) — não sanitizar. */
function isFirestoreSentinel(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  return (
    "_methodName" in value ||
    ("constructor" in value &&
      (value as { constructor?: { name?: string } }).constructor?.name ===
        "Timestamp")
  );
}

function sanitizarValor(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (isFirestoreSentinel(value)) return value;
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (item === undefined) return null;
      return sanitizarValor(item);
    });
  }
  if (
    value !== null &&
    typeof value === "object" &&
    !(value instanceof Date)
  ) {
    return sanitizarParaFirestore(value as Record<string, unknown>);
  }
  return value;
}

/** Remove chaves com valor undefined (recursivo em objetos e arrays). */
export function sanitizarParaFirestore<T extends Record<string, unknown>>(
  obj: T,
): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    const next = sanitizarValor(value);
    if (next === undefined) continue;
    out[key] = next;
  }
  return out as T;
}
