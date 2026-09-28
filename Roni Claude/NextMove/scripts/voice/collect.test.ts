import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { collectLines } from './collect.ts'
import { CHAPTERS } from '../../src/academy/lessons.ts'
import { clipKey, sentences } from '../../src/lib/voiceText.ts'
import manifest from '../../src/voice/manifest.json'

const recorded = new Set<string>(manifest.clips)

describe("Elias's recorded voice covers the Academy", () => {
  it('every collected sentence has a recording on disk', () => {
    const missing = collectLines().filter((l) => !recorded.has(l.key) || !existsSync(`public/voice/${manifest.voice}/${l.key}.mp3`))
    expect(missing.map((l) => l.text)).toEqual([])
  })

  it('every lesson step is spoken entirely in the recorded voice (both styles)', () => {
    const gaps: string[] = []
    for (const c of CHAPTERS)
      for (const l of c.lessons)
        for (const step of l.steps)
          for (const text of [step.text, step.kids].filter((t): t is string => !!t))
            for (const s of sentences(text)) if (!recorded.has(clipKey(s))) gaps.push(`${l.id}: ${s}`)
    expect(gaps).toEqual([])
  })
})

describe('sentences are split where a person would pause', () => {
  it('keeps move numbers, asides and trailing dots inside their sentence', () => {
    expect(sentences('After 1.e4 e5 — which move is best?')).toEqual(['After e4 e5, which move is best?'])
    expect(sentences('Move one piece out of the way and — surprise! — the piece behind it attacks!')).toHaveLength(1)
    expect(sentences('Well done!. Three stars!')).toEqual(['Well done!', 'Three stars!'])
    expect(sentences('Black just played d7–d5. Capture en passant!')).toEqual([
      'Black just played the pawn from d7 to d5.',
      'Capture en passant!',
    ])
  })

  it('the same sentence always gets the same recording, whatever quotes or spacing', () => {
    expect(clipKey("It's  mate.")).toBe(clipKey('It’s mate.'))
    expect(clipKey('Check!')).not.toBe(clipKey('Check.'))
  })
})
