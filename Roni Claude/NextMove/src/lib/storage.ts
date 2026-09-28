// localStorage can throw (private mode, blocked site data) — never let that break the app.
const PREFIX = 'nextmove:'

/**
 * Reads a saved value. `valid` guards against data of the wrong shape (an older version,
 * a hand edit, a browser extension): anything it rejects reads as `fallback` (QA I).
 */
export function load<T>(key: string, fallback: T, valid?: (v: unknown) => boolean): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw == null) return fallback
    const v: unknown = JSON.parse(raw)
    return valid && !valid(v) ? fallback : (v as T)
  } catch {
    return fallback
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

/** A plain object (not null, not an array). */
export const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

export const isStrings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((s) => typeof s === 'string')

/** Keeps only the items of a saved list that pass `ok`; anything that isn't a list reads as []. */
export function loadList<T>(key: string, ok: (item: Record<string, unknown>) => boolean): T[] {
  const v = load<unknown>(key, [])
  return Array.isArray(v) ? (v.filter((x) => isObj(x) && ok(x)) as T[]) : []
}
