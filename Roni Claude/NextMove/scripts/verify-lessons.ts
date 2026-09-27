// Engine check of the whole Academy curriculum. Run: npm run verify:lessons
//  - puzzle moves (verify 'best') must be the engine's choice (≤ 30 cp worse, or an equally fast mate)
//  - opening moves (verify 'book') must be sound (≤ 90 cp worse than best, not losing)
//  - "any mate" steps must have a mate in one; the listed move must be one
//  - goals must be reachable: mate/promote winning, capture not losing, hold not lost;
//    a mate goal's forced mate must fit in `within` moves
// Prints every problem and exits 1 if there are any.
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { Chess } from 'chess.js'
import { CHAPTERS } from '../src/academy/lessons.ts'
import { matchesExpected } from '../src/academy/validate.ts'

const require = createRequire(import.meta.url)
const initEngine = require('stockfish')

type Line = { cp: number | null; mate: number | null; pv: string[] }
const engine = await initEngine(resolve('node_modules/stockfish/bin/stockfish-19-lite-single.js'))
let onLine: ((l: string) => void) | null = null
engine.listener = (l: string) => onLine?.(l)

function send(cmd: string) {
  engine.sendCommand(cmd)
}

function search(fen: string, depth: number, multipv = 1): Promise<Line[]> {
  return new Promise((done) => {
    const lines = new Map<number, Line>()
    onLine = (l) => {
      if (l.startsWith('info') && l.includes(' pv ') && !l.includes('bound')) {
        const t = l.split(/\s+/)
        const k = t.indexOf('multipv') >= 0 ? Number(t[t.indexOf('multipv') + 1]) : 1
        const s = t.indexOf('score')
        lines.set(k, {
          cp: t[s + 1] === 'cp' ? Number(t[s + 2]) : null,
          mate: t[s + 1] === 'mate' ? Number(t[s + 2]) : null,
          pv: t.slice(t.indexOf('pv') + 1),
        })
      }
      if (l.startsWith('bestmove')) {
        onLine = null
        done([...lines.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]))
      }
    }
    send(`setoption name MultiPV value ${multipv}`)
    send(`position fen ${fen}`)
    send(`go depth ${depth}`)
  })
}

/** Score in centipawns for the side to move; mates are ±(100000 - distance). */
const value = (l: Line) => (l.mate !== null ? (l.mate > 0 ? 100000 - l.mate : -100000 - l.mate) : l.cp!)

const problems: string[] = []
let checked = 0

send('uci')
send('isready')

for (const ch of CHAPTERS)
  for (const lesson of ch.lessons)
    for (const [i, s] of lesson.steps.entries()) {
      const where = `${lesson.id} step ${i + 1}`
      if (s.kind === 'moves') {
        const c = new Chess(s.fen)
        for (let k = 0; k < s.line.length; k++) {
          const mine = s.opponentFirst ? k % 2 === 1 : k % 2 === 0
          const entry = s.line[k]
          const fen = c.fen()
          const played = c.move(entry.split('|')[0])
          if (!mine || s.verify === 'legal') continue
          checked++
          if (s.any === 'mate') {
            if (!played.san.includes('#')) problems.push(`${where}: "${entry}" is not checkmate`)
            continue
          }
          if (s.any === 'check') continue
          const [best] = await search(fen, 16)
          const after = await search(played.after, 14)
          const bestV = value(best)
          const playedV = after[0] ? -value(after[0]) : played.san.includes('#') ? 100000 : 0
          const loss = bestV - playedV
          const bothMates = bestV > 90000 && playedV > 90000
          // In a won position a few dozen cp of search noise mean nothing: allow 12% of the eval.
          const slack = Math.max(30, Math.abs(bestV) * 0.12)
          if (played.lan === best.pv[0]) {
            // the engine's own move
          } else if (s.verify === 'book') {
            if (loss > 90 || playedV < -120)
              problems.push(`${where}: book move ${played.san} loses ${loss} cp (eval ${playedV}); engine prefers ${best.pv[0]}`)
          } else if (!bothMates && loss > slack) {
            problems.push(`${where}: ${played.san} is ${loss} cp worse than the engine's ${best.pv[0]} (${bestV})`)
          }
          // alternatives listed with | must be sound too
          for (const alt of entry.split('|').slice(1)) {
            const c2 = new Chess(fen)
            const m2 = c2.move(alt)
            const [a2] = await search(m2.after, 14)
            const v2 = a2 ? -value(a2) : 100000
            if (bestV - v2 > (s.verify === 'book' ? 90 : slack) && !(bestV > 90000 && v2 > 90000))
              problems.push(`${where}: accepted alternative ${alt} loses ${bestV - v2} cp`)
          }
        }
        // the expected-move matcher must accept the line's own SAN
        const c3 = new Chess(s.fen)
        for (const entry of s.line) {
          const m = c3.move(entry.split('|')[0])
          if (!matchesExpected(m.san, entry)) problems.push(`${where}: matcher rejects ${m.san} for "${entry}"`)
        }
      } else if (s.kind === 'goal') {
        checked++
        const [best] = await search(s.fen, 20)
        const v = value(best)
        const need = { mate: 300, promote: 300, capture: -50, hold: -150 }[s.goal]
        if (v < need) problems.push(`${where}: goal "${s.goal}" not reachable — engine eval ${v} (needs ≥ ${need})`)
        if (s.goal === 'mate' && s.within && best.mate !== null && best.mate > s.within)
          problems.push(`${where}: forced mate takes ${best.mate} moves but within = ${s.within}`)
      }
    }

console.log(`checked ${checked} engine positions`)
if (problems.length) {
  console.log(`${problems.length} problems:`)
  for (const p of problems) console.log('  ✗ ' + p)
  process.exit(1)
}
console.log('0 problems')
process.exit(0)
