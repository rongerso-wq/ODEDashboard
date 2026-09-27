// Fast rules-only checks of the curriculum (no engine). The engine checks run in
// scripts/verify-lessons.ts.
import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import { ALL_LESSONS, CHAPTERS } from './lessons'
import { bestMoveCount, collectBoard } from './collect'
import { checkChoiceFact, replayLine } from './validate'

describe('curriculum', () => {
  it('has unique lesson ids', () => {
    const ids = ALL_LESSONS.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  for (const ch of CHAPTERS)
    for (const l of ch.lessons)
      describe(`${ch.id} / ${l.id}`, () => {
        l.steps.forEach((s, i) => {
          it(`step ${i + 1} (${s.kind})`, () => {
            if (s.kind === 'info') {
              if (s.fen) collectBoard(s.fen)
            } else if (s.kind === 'collect') {
              expect(bestMoveCount({ fen: s.fen, stars: s.stars })).not.toBeNull()
            } else if (s.kind === 'choice') {
              new Chess(s.fen)
              expect(s.answer).toBeLessThan(s.options.length)
              if (s.fact) expect(checkChoiceFact(s.fen, s.fact)).toBe(true)
            } else if (s.kind === 'moves') {
              expect(replayLine(s.fen, s.line)).toBe(true)
            } else if (s.kind === 'goal') {
              expect(new Chess(s.fen).isGameOver()).toBe(false)
            }
          })
        })
      })
})
