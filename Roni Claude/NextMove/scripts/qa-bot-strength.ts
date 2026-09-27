// QA B4: do the 8 bots get steadily stronger? Each bot picks a move (with its real settings:
// randomness, Skill Level, depth, movetime) in the same 70 positions; a depth-14 search then measures
// how much each choice loses against the best move. Average loss must fall from Pip to Nova.
// Run: node scripts/qa-bot-strength.ts
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Chess } from 'chess.js'
import { BOTS, randomMove } from '../src/engine/bots.ts'

const require = createRequire(import.meta.url)
const engine = await require('stockfish')(resolve('node_modules/stockfish/bin/stockfish-19-lite-single.js'))
let onLine: ((l: string) => void) | null = null
engine.listener = (l: string) => onLine?.(l)

type Result = { best: string; cp: number }
function go(fen: string, cmd: string, o: { skill?: number; elo?: number } = {}): Promise<Result> {
  return new Promise((done) => {
    let cp = 0
    onLine = (l) => {
      const m = l.match(/ score (cp|mate) (-?\d+)/)
      if (m && l.includes(' pv ') && !l.includes('bound')) cp = m[1] === 'cp' ? +m[2] : (+m[2] > 0 ? 10000 : -10000)
      if (l.startsWith('bestmove')) {
        onLine = null
        done({ best: l.split(' ')[1], cp })
      }
    }
    // same options as src/engine/engine.ts
    engine.sendCommand(`setoption name UCI_LimitStrength value ${o.elo ? 'true' : 'false'}`)
    if (o.elo) engine.sendCommand(`setoption name UCI_Elo value ${o.elo}`)
    engine.sendCommand(`setoption name Skill Level value ${o.elo ? 20 : (o.skill ?? 20)}`)
    engine.sendCommand(`position fen ${fen}`)
    engine.sendCommand(cmd)
  })
}

// 60 middlegame puzzle positions (after the lead-in move) + 10 quiet opening positions.
const puzzles = JSON.parse(readFileSync('src/puzzles/puzzles.json', 'utf8')).puzzles as [string, string, string, number, string][]
const positions: string[] = puzzles
  .filter((_, i) => i % 30 === 0)
  .slice(0, 60)
  .map(([, fen, moves]) => {
    const c = new Chess(fen)
    const u = moves.split(' ')[0]
    c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })
    return c.fen()
  })
for (const line of ['e4 e5 Nf3', 'd4 d5 c4', 'e4 c5 Nf3 d6', 'Nf3 Nf6 c4', 'e4 e6 d4 d5', 'd4 Nf6 c4 g6 Nc3', 'e4 c6 d4 d5 Nc3', 'c4 e5 Nc3', 'e4 e5 Nf3 Nc6 Bb5', 'd4 d5 Bf4 Nf6 e3']) {
  const c = new Chess()
  for (const m of line.split(' ')) c.move(m)
  positions.push(c.fen())
}

engine.sendCommand('uci')
const rows: { bot: string; avgLoss: number; blunders: number; ms: number }[] = []
for (const bot of BOTS) {
  let loss = 0
  let blunders = 0
  let ms = 0
  for (const fen of positions) {
    const c = new Chess(fen)
    const t0 = performance.now()
    let uci: string
    if (Math.random() < bot.randomness) {
      const m = randomMove(c)!
      uci = m.from + m.to + (m.promotion ?? '')
    } else {
      const lim = [bot.search.depth ? `depth ${bot.search.depth}` : '', bot.search.movetime ? `movetime ${Math.min(bot.search.movetime, 400)}` : ''].filter(Boolean).join(' ')
      uci = (await go(fen, `go ${lim || 'depth 12'}`, { skill: bot.search.skill, elo: bot.search.elo })).best
    }
    ms += performance.now() - t0
    const best = await go(fen, 'go depth 14')
    c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }) // throws if illegal
    const after = c.isCheckmate() ? { cp: -10000 } : await go(c.fen(), 'go depth 12')
    const l = Math.max(0, Math.min(1000, best.cp - -after.cp))
    loss += l
    if (l >= 300) blunders++
  }
  rows.push({ bot: bot.name, avgLoss: Math.round(loss / positions.length), blunders, ms: Math.round(ms / positions.length) })
  console.log(`${bot.name.padEnd(18)} avg loss ${String(Math.round(loss / positions.length)).padStart(4)} cp · blunders ${String(blunders).padStart(2)}/${positions.length} · ${Math.round(ms / positions.length)} ms/move`)
}
// each level must lose less than the level below it (no plateaus, no cliffs worth hiding)
const monotonic = rows.every((r, i) => i === 0 || r.avgLoss < rows[i - 1].avgLoss)
console.log(monotonic ? 'strength rises steadily ✓' : 'strength ordering has a dip ✗')
process.exit(0)
