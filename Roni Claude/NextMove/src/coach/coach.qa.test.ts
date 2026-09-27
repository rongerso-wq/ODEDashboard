// QA C7/C8 with the real engine (slow, so only on demand):  QA=1 npx vitest run src/coach/coach.qa
// - grading: the puzzle solution move must grade best/good; a move that loses ≥ 3 pawns must grade
//   mistake/blunder
// - every explanation and hint is well-formed text
// - opponent commentary never throws or prints garbage over 20 random games
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import type { Analysis } from './analysis'
import { explainMove, hintFor, youVoice } from './explain'
import { scoreToCp } from './grade'
import { commentOnMove } from './commentary'

const run = !!process.env.QA
const bad = /undefined|null|NaN|\[object/

describe.runIf(run)('coach with the real engine', () => {
  it('grades, explains and hints sensibly on 40 real positions', async () => {
    const require = createRequire(import.meta.url)
    const engine = await require('stockfish')(resolve('node_modules/stockfish/bin/stockfish-19-lite-single.js'))
    let onLine: ((l: string) => void) | null = null
    engine.listener = (l: string) => onLine?.(l)
    const analyse = (fen: string): Promise<Analysis> =>
      new Promise((done) => {
        const c = new Chess(fen)
        if (c.isCheckmate()) return done({ fen, cp: -10000, best: null, pv: [], depth: 0 })
        if (c.isDraw()) return done({ fen, cp: 0, best: null, pv: [], depth: 0 })
        let cp = 0
        let pv: string[] = []
        onLine = (l) => {
          const m = l.match(/ score (cp|mate) (-?\d+)/)
          if (m && l.includes(' pv ') && !l.includes('bound')) {
            cp = scoreToCp(m[1] === 'cp' ? { cp: +m[2] } : { mate: +m[2] })
            pv = l.split(' pv ')[1].split(' ')
          }
          if (l.startsWith('bestmove')) {
            onLine = null
            done({ fen, cp, best: l.split(' ')[1], pv, depth: 14 })
          }
        }
        engine.sendCommand(`position fen ${fen}`)
        engine.sendCommand('go depth 14')
      })

    const puzzles = JSON.parse(readFileSync('src/puzzles/puzzles.json', 'utf8')).puzzles as [string, string, string, number, string][]
    const sample = puzzles.filter((_, i) => i % 46 === 0).slice(0, 40)
    const voice = youVoice('Pip', false)
    const problems: string[] = []
    let bestOk = 0
    let blunderOk = 0
    let blunderCases = 0

    for (const [id, fen0, moves] of sample) {
      const c = new Chess(fen0)
      const lead = moves.split(' ')[0]
      c.move({ from: lead.slice(0, 2), to: lead.slice(2, 4), promotion: lead[4] })
      const fen = c.fen()
      const before = await analyse(fen)
      const sol = moves.split(' ')[1]

      // 1. the solution move
      const good = new Chess(fen).move({ from: sol.slice(0, 2), to: sol.slice(2, 4), promotion: sol[4] })
      const fbGood = explainMove({ move: good, ply: 20, before, after: await analyse(good.after), voice })
      if (fbGood.grade === 'best' || fbGood.grade === 'good') bestOk++
      else problems.push(`${id}: solution ${good.san} graded ${fbGood.grade}`)
      if (!fbGood.text || bad.test(fbGood.text)) problems.push(`${id}: bad text "${fbGood.text}"`)

      // 2. the worst-looking legal move the engine agrees is ≥ 300 cp worse
      for (const m of new Chess(fen).moves({ verbose: true }).slice(0, 12)) {
        if (m.lan === sol) continue
        const after = await analyse(m.after)
        if (before.cp - -after.cp < 300) continue
        blunderCases++
        const fb = explainMove({ move: m, ply: 20, before, after, voice })
        if (fb.grade === 'mistake' || fb.grade === 'blunder') blunderOk++
        else problems.push(`${id}: ${m.san} (loses ${before.cp + after.cp} cp) graded ${fb.grade}`)
        if (!fb.text || bad.test(fb.text)) problems.push(`${id}: bad text "${fb.text}"`)
        break
      }

      // 3. hints, all three levels
      for (const level of [1, 2, 3] as const) {
        const h = hintFor(before, level, 20, false)
        if (!h || !h.text || bad.test(h.text)) problems.push(`${id}: hint ${level} → ${JSON.stringify(h)}`)
        if (level === 3 && h && !h.arrow) problems.push(`${id}: hint 3 has no arrow`)
      }
    }
    console.log(`solution graded best/good: ${bestOk}/${sample.length}; losing moves graded mistake/blunder: ${blunderOk}/${blunderCases}`)
    if (problems.length) console.log(problems.join('\n'))
    expect(problems).toEqual([])
  }, 900_000)
})

describe.runIf(run)('commentary fuzz', () => {
  // ~6 ms per comment (rules-only analysis), fine for one comment per move in the app
  it('never throws or prints garbage over 20 random games', () => {
    let comments = 0
    const kinds = new Map<string, number>()
    for (let g = 0; g < 20; g++) {
      const c = new Chess()
      for (let ply = 0; ply < 80 && !c.isGameOver(); ply++) {
        const moves = c.moves({ verbose: true })
        const m = c.move(moves[Math.floor(Math.random() * moves.length)])
        for (const kids of [false, true]) {
          const out = commentOnMove(m, ply, { bot: 'Pip', kids })
          if (!out) continue
          comments++
          expect(out.text).not.toMatch(bad)
          expect(out.text.length).toBeLessThan(220)
          const k = out.text.split(/[.!:,]/)[0].slice(0, 22)
          kinds.set(k, (kinds.get(k) ?? 0) + 1)
        }
      }
    }
    expect(comments).toBeGreaterThan(40)
  }, 60_000)
})
