import { Chess } from 'chess.js'
import type { Engine, SearchOptions } from '../engine/engine'
import { MATE_CP, scoreToCp } from './grade'

/** Engine verdict on one position. `cp` is from the point of view of the side to move. */
export type Analysis = {
  fen: string
  cp: number
  best: string | null // UCI
  pv: string[]
  depth: number
}

export const LIVE: SearchOptions = { depth: 14, movetime: 650 }
export const REVIEW: SearchOptions = { depth: 12, movetime: 260 }

/** Finished positions are scored by the rules, not the engine. */
function terminal(fen: string): Analysis | null {
  const c = new Chess(fen)
  if (c.isCheckmate()) return { fen, cp: -MATE_CP, best: null, pv: [], depth: 0 }
  if (c.isStalemate() || c.isInsufficientMaterial() || c.isDrawByFiftyMoves())
    return { fen, cp: 0, best: null, pv: [], depth: 0 }
  return null
}

export async function analyse(engine: Engine, fen: string, opts: SearchOptions = LIVE): Promise<Analysis | null> {
  const t = terminal(fen)
  if (t) return t
  const res = await engine.search(fen, { ...opts, skill: 20, multipv: 1 })
  const line = res.lines[0]
  if (!res.bestmove || !line) return null // search was cancelled
  return { fen, cp: scoreToCp(line.score), best: res.bestmove, pv: line.pv, depth: line.depth }
}

/** Remembers analyses per FEN, so a position is never searched twice. */
export class AnalysisCache {
  private map = new Map<string, Promise<Analysis | null>>()
  private engine: Engine
  private opts: SearchOptions
  constructor(engine: Engine, opts: SearchOptions = LIVE) {
    this.engine = engine
    this.opts = opts
  }

  get(fen: string): Promise<Analysis | null> {
    let p = this.map.get(fen)
    if (!p) {
      p = analyse(this.engine, fen, this.opts).then((a) => {
        if (!a) this.map.delete(fen) // cancelled: allow a retry later
        return a
      })
      this.map.set(fen, p)
    }
    return p
  }
}

/** "e2e4" in `fen` -> "e4" (null if illegal) */
export function uciToSan(fen: string, uci: string | null): string | null {
  if (!uci) return null
  try {
    return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san
  } catch {
    return null
  }
}
