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

// ───────────── keeping progress safe (QA 2026-10-01) ─────────────

/**
 * Asks the browser not to clear NextMove's data on its own (Safari can wipe a site's storage
 * after weeks unused; Chrome when space runs low). Granted silently for installed apps; otherwise
 * the browser may say no, which changes nothing.
 */
export function requestPersistentStorage(): void {
  try {
    void navigator.storage?.persist?.().catch(() => {})
  } catch {
    /* not supported */
  }
}

type Backup = { app: 'NextMove'; version: 1; exportedAt: string; data: Record<string, unknown> }

/** Everything NextMove has saved on this device, as a backup file's text. */
export function exportProgress(): string {
  const data: Record<string, unknown> = {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k?.startsWith(PREFIX)) continue
      try {
        data[k.slice(PREFIX.length)] = JSON.parse(localStorage.getItem(k) ?? 'null')
      } catch {
        /* a damaged value is left out */
      }
    }
  } catch {
    /* storage blocked: an empty backup */
  }
  const backup: Backup = { app: 'NextMove', version: 1, exportedAt: new Date().toISOString(), data }
  return JSON.stringify(backup, null, 1)
}

/**
 * Restores a backup file's text, replacing what is saved now. Each value is still checked by its
 * own loader when the app reads it, so a hand-edited file can't crash a screen.
 * Returns the number of items restored, or an error message.
 */
export function importProgress(text: string): { restored: number } | { error: string } {
  let backup: unknown
  try {
    backup = JSON.parse(text)
  } catch {
    return { error: 'This file is not a NextMove backup.' }
  }
  if (!isObj(backup) || backup.app !== 'NextMove' || !isObj(backup.data)) return { error: 'This file is not a NextMove backup.' }
  const entries = Object.entries(backup.data).filter(([k]) => /^[a-z][a-z0-9-]{0,40}$/.test(k))
  if (!entries.length) return { error: 'This backup is empty.' }
  try {
    const old: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith(PREFIX)) old.push(k)
    }
    for (const k of old) localStorage.removeItem(k)
    for (const [k, v] of entries) localStorage.setItem(PREFIX + k, JSON.stringify(v))
  } catch {
    return { error: 'This device would not let NextMove save the backup.' }
  }
  return { restored: entries.length }
}

/** Keeps only the items of a saved list that pass `ok`; anything that isn't a list reads as []. */
export function loadList<T>(key: string, ok: (item: Record<string, unknown>) => boolean): T[] {
  const v = load<unknown>(key, [])
  return Array.isArray(v) ? (v.filter((x) => isObj(x) && ok(x)) as T[]) : []
}
