// What Elias actually says, sentence by sentence, and the name of each sentence's recording.
// Shared by the app (lib/voice.ts) and the recorder (scripts/voice/), so a recording is found
// only if it was made from exactly the text the app speaks. No DOM here: Node runs this file too.
import { speakable } from './speakable.ts'

/**
 * The sentences `speak()` says for `text`, after notation and emoji are turned into words.
 * A sentence ends at . ! ? or … only when the next one starts with a capital, a digit or a quote,
 * so "and, surprise! , the piece…" and "…protected… or does it" stay whole.
 */
export function sentences(text: string): string[] {
  const clean = speakable(text).replace(/([!?])\s*\./g, '$1') // "Well done!. Three stars" (title + praise)
  if (!clean) return []
  return clean
    .split(/(?<=[.!?…][)"'”’]*)\s+(?=[A-Z0-9"“(])/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Curly quotes, dashes and spacing don't change how a sentence sounds, so they don't change its key. */
export const normalise = (s: string) =>
  s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()

/** The recording's file name (without .mp3): an FNV-1a hash of the sentence plus its length. */
export function clipKey(sentence: string): string {
  const s = normalise(sentence)
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0') + s.length.toString(36)
}
