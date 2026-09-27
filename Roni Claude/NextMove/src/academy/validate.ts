// Rule checks shared by the lesson player, the unit tests and scripts/verify-lessons.ts.
import { Chess, type Move } from 'chess.js'
import type { ChoiceStep } from './types'

/** Does `san` match an expected entry ("Nf3", or alternatives "g6|Qe7")? Ignores +/# marks. */
export function matchesExpected(san: string, expected: string): boolean {
  const clean = (s: string) => s.replace(/[+#!?]/g, '')
  return expected.split('|').some((e) => clean(e) === clean(san))
}

/** Every entry of the line is legal in order (the first alternative is used to continue). */
export function replayLine(fen: string, line: string[]): boolean {
  const c = new Chess(fen)
  try {
    for (const entry of line) c.move(entry.split('|')[0])
    return true
  } catch {
    return false
  }
}

export function checkChoiceFact(fen: string, fact: NonNullable<ChoiceStep['fact']>): boolean {
  const c = new Chess(fen)
  switch (fact) {
    case 'check':
      return c.inCheck() && !c.isCheckmate()
    case 'not-check':
      return !c.inCheck()
    case 'mate':
      return c.isCheckmate()
    case 'stalemate':
      return c.isStalemate()
    case 'can-castle-k':
      return c.moves().includes('O-O')
    case 'cannot-castle-k':
      return !c.moves().includes('O-O')
  }
}

/** For `any` steps: is the played move a check / a checkmate? */
export function satisfiesAny(m: Move, any: 'check' | 'mate'): boolean {
  return any === 'mate' ? m.san.includes('#') : m.san.includes('+') || m.san.includes('#')
}
