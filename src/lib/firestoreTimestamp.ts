/** Converte Timestamp Firestore (ou variantes) em Date. */
export function firestoreTimestampToDate(value: unknown): Date | null {
  if (value == null) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  // Firebase SDK v9+ — instância Timestamp
  if (
    typeof value === "object" &&
    value !== null &&
    "constructor" in value &&
    (value as { constructor?: { name?: string } }).constructor?.name ===
      "Timestamp"
  ) {
    try {
      const date = (value as { toDate: () => Date }).toDate();
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
    } catch {
      /* fallback abaixo */
    }
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;

    if (
      "toDate" in obj &&
      typeof obj.toDate === "function"
    ) {
      const date = (obj.toDate as () => Date)();
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
    }

    const seconds =
      typeof obj.seconds === "number"
        ? obj.seconds
        : typeof obj._seconds === "number"
          ? obj._seconds
          : null;

    if (seconds !== null) {
      const nanos =
        typeof obj.nanoseconds === "number"
          ? obj.nanoseconds
          : typeof obj._nanoseconds === "number"
            ? obj._nanoseconds
            : 0;
      return new Date(seconds * 1000 + nanos / 1_000_000);
    }
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

export function firestoreTimestampToMillis(value: unknown): number {
  const date = firestoreTimestampToDate(value);
  return date ? date.getTime() : 0;
}
