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

/** Remove chaves com valor undefined (recursivo em objetos plain). */
export function sanitizarParaFirestore<T extends Record<string, unknown>>(
  obj: T,
): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (isFirestoreSentinel(value)) {
      out[key] = value;
      continue;
    }
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      out[key] = sanitizarParaFirestore(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out as T;
}
