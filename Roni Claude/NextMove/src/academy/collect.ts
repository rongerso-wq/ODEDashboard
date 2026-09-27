// "Collect the stars" exercises: only White moves (Black's pieces are targets that never move),
// and boards may have no kings, so chess.js runs with validation off and the turn is reset to
// White after every move.
import { Chess, type Move, type Square } from 'chess.js'

export function collectBoard(fen: string): Chess {
  const c = new Chess()
  c.load(fen, { skipValidation: true })
  return c
}

/** Same position with White to move again and no en-passant square. */
function whiteAgain(fen: string): string {
  const p = fen.split(' ')
  p[1] = 'w'
  p[3] = '-'
  return p.join(' ')
}

export type CollectState = { fen: string; stars: Square[] }

/** Plays a move; returns the new state and whether a star or piece was taken. */
export function collectMove(
  s: CollectState,
  move: { from: Square; to: Square; promotion?: string },
): { state: CollectState; move: Move; star: boolean } | null {
  const c = collectBoard(s.fen)
  let m: Move
  try {
    m = c.move(move)
  } catch {
    return null
  }
  const star = s.stars.includes(m.to)
  return { state: { fen: whiteAgain(c.fen()), stars: s.stars.filter((x) => x !== m.to) }, move: m, star }
}

export const blackLeft = (fen: string) => {
  let n = 0
  for (const row of collectBoard(fen).board()) for (const p of row) if (p?.color === 'b') n++
  return n
}

export const collectDone = (s: CollectState) => s.stars.length === 0 && blackLeft(s.fen) === 0

/** Fewest moves that collect every star and capture every black piece (breadth-first search). */
export function bestMoveCount(start: CollectState, maxDepth = 14): number | null {
  const key = (s: CollectState) => `${s.fen.split(' ')[0]}|${[...s.stars].sort().join(',')}`
  let frontier: CollectState[] = [start]
  const seen = new Set([key(start)])
  for (let depth = 0; depth <= maxDepth; depth++) {
    const next: CollectState[] = []
    for (const s of frontier) {
      if (collectDone(s)) return depth
      for (const m of collectBoard(s.fen).moves({ verbose: true })) {
        const r = collectMove(s, { from: m.from, to: m.to, promotion: m.promotion })
        if (!r) continue
        const k = key(r.state)
        if (seen.has(k)) continue
        seen.add(k)
        next.push(r.state)
      }
    }
    frontier = next
  }
  return null
}
