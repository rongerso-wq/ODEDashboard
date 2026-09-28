// Collects every fixed sentence Elias says, for the recorder (record.mjs) and the coverage test.
// Phase 1: the Academy (all lesson text in both styles, lesson intros, feedback and praise) and
// the Settings sample. Sentences with changing parts (numbers, moves) come in phase 2.
// Run: node scripts/voice/collect.ts   → writes scripts/voice/lines.json
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { CHAPTERS } from '../../src/academy/lessons.ts'
import { sentences, clipKey } from '../../src/lib/voiceText.ts'

const src = (p: string) => readFileSync(new URL(`../../src/${p}`, import.meta.url), 'utf8')

// Fields of lesson data that are never spoken.
const SKIP = new Set(['id', 'fen', 'line', 'moves', 'hue', 'icon', 'answer', 'stars', 'goal', 'fact', 'any', 'verify', 'within'])
const FEN = /^[1-8pnbrqkPNBRQK/]+ [wb] /

function walk(v: unknown, out: string[]) {
  if (typeof v === 'string') {
    if (/[a-z]/i.test(v) && !FEN.test(v)) out.push(v)
  } else if (Array.isArray(v)) v.forEach((x) => walk(x, out))
  else if (v && typeof v === 'object')
    for (const [k, x] of Object.entries(v)) if (!SKIP.has(k)) walk(x, out)
}

/**
 * Plain string literals in a screen's code that read like speech (start with a capital, or end in
 * sentence punctuation). Template literals with ${} are left for phase 2.
 */
function literals(code: string): string[] {
  const out: string[] = []
  for (const m of code.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g)) {
    const s = (m[1] ?? m[2]).replace(/\\'/g, "'")
    if (/\s/.test(s) && /[a-z]/.test(s) && (/^[A-Z]/.test(s) || /[.!?]$/.test(s)) && !/[{}<>=;]|^\.\/|^[a-z-]+ [a-z-]+$/.test(s))
      out.push(s)
  }
  return out
}

export function collectTexts(): string[] {
  const texts: string[] = []
  for (const c of CHAPTERS)
    for (const l of c.lessons) {
      walk(l, texts)
      // the intro LessonPlayer speaks before the first step
      texts.push(`Today's lesson: ${l.title}.`, `Hello, my young friend! Today's lesson: ${l.kidsTitle ?? l.title}.`)
    }
  for (const f of ['screens/LessonPlayer.tsx', 'screens/Academy.tsx', 'components/SettingsSheet.tsx']) texts.push(...literals(src(f)))
  // Lesson complete: LessonPlayer speaks `${title}. ${praise}`
  for (const t of ['Lesson complete', 'Well done!', 'Perfect!', 'You did it!', 'Great job!', 'Superstar! 🌟']) texts.push(`${t}.`)
  return texts
}

/** Only whole sentences: screen labels ("Back to home"), option labels and titles aren't spoken alone. */
const SENTENCE = /[.!?…]["')”’]*$/

/** Every distinct sentence, with its recording's key. */
export function collectLines(): { key: string; text: string }[] {
  const seen = new Map<string, string>()
  for (const t of collectTexts()) for (const s of sentences(t)) if (SENTENCE.test(s) && /[a-z]{2}/i.test(s)) seen.set(clipKey(s), s)
  return [...seen].map(([key, text]) => ({ key, text })).sort((a, b) => a.text.localeCompare(b.text))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const lines = collectLines()
  writeFileSync(new URL('./lines.json', import.meta.url), JSON.stringify(lines, null, 1) + '\n')
  const chars = lines.reduce((n, l) => n + l.text.length, 0)
  console.log(`${lines.length} sentences, ${chars} characters → scripts/voice/lines.json`)
}
