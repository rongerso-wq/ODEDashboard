// Everything Elias says during play must be a recorded sentence. Random games go through the real
// coach, commentary and hint code (with made-up engine scores), and every spoken sentence is
// looked up in the collected lines, i.e. what `npm run voice` records.
import { describe, expect, it } from 'vitest'
import { Chess, type Move } from 'chess.js'
import { collectLines } from './collect.ts'
import { sentences } from '../../src/lib/voiceText.ts'
import { OPPONENTS } from '../../src/coach/say.ts'
import { commentOnMove } from '../../src/coach/commentary'
import { explainMove, gradeTitle, hintFor, youVoice } from '../../src/coach/explain'
import type { Analysis } from '../../src/coach/analysis'

const lines = new Set(collectLines().map((l) => l.text))
const missing = new Set<string>()
const check = (text: string | null | undefined) => {
  if (text) for (const s of sentences(text)) if (!lines.has(s)) missing.add(s)
}

// A small deterministic random generator, so a failure can be reproduced.
let seed = 12345
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)]
const SCORES = [0, 20, -40, 80, -150, 300, -700, 1200, 9998, -9998, 9996, -9995]

function randomGame(maxPlies: number): Move[] {
  const c = new Chess()
  const moves: Move[] = []
  while (!c.isGameOver() && moves.length < maxPlies) {
    const ms = c.moves({ verbose: true })
    // prefer captures and checks a little, so tactics come up
    const hot = ms.filter((m) => m.captured || m.san.includes('+'))
    moves.push(c.move(hot.length && rnd() < 0.5 ? pick(hot) : pick(ms)))
  }
  return moves
}

const analysis = (fen: string, cp: number): Analysis => {
  const ms = new Chess(fen).moves({ verbose: true })
  return { fen, cp, best: ms.length ? pick(ms).lan : null, pv: [], depth: 12 }
}

describe('everything Elias says during play has a recording', () => {
  it('in 25 random games: coach verdicts, grade titles, commentary and hints (both styles)', () => {
    for (let g = 0; g < 25; g++) {
      const kids = g % 2 === 1
      const bot = pick(OPPONENTS.slice(0, 8))
      for (const [ply, m] of randomGame(80).entries()) {
        check(commentOnMove(m, ply, { bot, kids })?.say)
        if (ply % 3 === 0) {
          const before = analysis(m.before, pick(SCORES))
          const after = analysis(m.after, pick(SCORES))
          const fb = explainMove({ move: m, ply, before, after, voice: youVoice(bot, kids) })
          check(`${gradeTitle(fb.grade, kids)}. ${fb.say}`)
          for (const level of [1, 2, 3] as const) check(hintFor(before, level, ply, kids)?.say)
        }
      }
    }
    expect([...missing]).toEqual([])
  }, 300_000)
})
