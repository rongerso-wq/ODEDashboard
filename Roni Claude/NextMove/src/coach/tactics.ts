// Plain tactical facts about a position, used to explain moves in words.
// Everything here is rules-based (chess.js); the engine decides which move is best.
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js'

export const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 }
export const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }

const other = (c: Color): Color => (c === 'w' ? 'b' : 'w')

/** `defended`: some own piece protects it. Then it isn't "free" or "unprotected": it can only be
 * won because something cheaper attacks it (or the capture is a good trade), so say that instead. */
export type Target = { square: Square; type: PieceSymbol; value: number; defended?: boolean }

/** Lowest-value piece of `by` attacking `sq` (Infinity if none). */
function cheapestAttacker(chess: Chess, sq: Square, by: Color): number {
  let min = Infinity
  for (const a of chess.attackers(sq, by)) {
    const p = chess.get(a)
    if (p) min = Math.min(min, VALUE[p.type])
  }
  return min
}

/**
 * Pieces of `color` (not the king) that the opponent can win: attacked and undefended,
 * or attacked by something cheaper. Most valuable first.
 */
export function hangingPieces(chess: Chess, color: Color): Target[] {
  const out: Target[] = []
  for (const row of chess.board())
    for (const p of row) {
      if (!p || p.color !== color || p.type === 'k') continue
      const cheapest = cheapestAttacker(chess, p.square, other(color))
      if (cheapest === Infinity) continue
      const defended = chess.attackers(p.square, color).length > 0
      if (!defended || cheapest < VALUE[p.type]) out.push({ square: p.square, type: p.type, value: VALUE[p.type], defended })
    }
  return out.sort((a, b) => b.value - a.value)
}

/** Does this capture win material outright (target undefended, or worth more than the capturer)? */
export function winsMaterial(before: string, m: Move): Target | null {
  if (!m.captured) return null
  const chess = new Chess(before)
  if (m.isEnPassant()) return { square: m.to, type: m.captured, value: VALUE[m.captured], defended: false }
  const defended = chess.attackers(m.to, other(m.color)).length > 0
  const target: Target = { square: m.to, type: m.captured, value: VALUE[m.captured], defended }
  return !defended || VALUE[m.captured] > VALUE[m.piece] ? target : null
}

/**
 * Enemy pieces the moved piece attacks after the move that matter: the king (check),
 * anything worth more than the mover, or anything undefended.
 */
export function forkTargets(after: string, m: Move): Target[] {
  const chess = new Chess(after)
  const enemy = other(m.color)
  const out: Target[] = []
  for (const row of chess.board())
    for (const p of row) {
      if (!p || p.color !== enemy) continue
      if (!chess.attackers(p.square, m.color).includes(m.to)) continue
      const undefended = chess.attackers(p.square, enemy).length === 0
      if (p.type === 'k' || VALUE[p.type] > VALUE[m.piece] || (undefended && p.type !== 'p'))
        out.push({ square: p.square, type: p.type, value: VALUE[p.type] })
    }
  return out.sort((a, b) => b.value - a.value)
}

/**
 * A real fork: two or more targets, and the forking piece can't simply be taken: not for free,
 * and not by a piece worth no more than it (a pawn taking a defended knight ends the "fork").
 */
export function isFork(after: string, m: Move): Target[] | null {
  const targets = forkTargets(after, m)
  if (targets.length < 2) return null
  const chess = new Chess(after)
  const cheapest = cheapestAttacker(chess, m.to, other(m.color))
  if (cheapest === Infinity) return targets
  const defended = chess.attackers(m.to, m.color).length > 0
  return !defended || cheapest <= VALUE[m.piece] ? null : targets
}

/**
 * What would the opponent do if it were their turn? Returns a mating move they threaten, if any.
 * (Skipped when the side to move is in check: they have to answer the check anyway.)
 */
export function mateThreat(fen: string): Move | null {
  const parts = fen.split(' ')
  parts[1] = parts[1] === 'w' ? 'b' : 'w'
  parts[3] = '-'
  try {
    if (new Chess(fen).inCheck()) return null
    return mateInOne(parts.join(' '))
  } catch {
    return null
  }
}

/** A move that checkmates immediately for the side to move, if there is one. */
export function mateInOne(fen: string): Move | null {
  const c = new Chess(fen)
  for (const m of c.moves({ verbose: true })) {
    c.move(m)
    const mate = c.isCheckmate()
    c.undo()
    if (mate) return m
  }
  return null
}

/** Minor piece leaving its home rank early in the game. */
export function isDevelopment(m: Move, ply: number): boolean {
  const home = m.color === 'w' ? '1' : '8'
  return ply < 24 && (m.piece === 'n' || m.piece === 'b') && m.from[1] === home
}

export function moveFromUci(fen: string, uci: string): Move | null {
  try {
    return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
  } catch {
    return null
  }
}

export const pieceAt = (t: Target) => `${NAME[t.type]} on ${t.square}`

/** "king and rook", "queen, rook and knight" */
export function listPieces(ts: Target[]): string {
  const names = ts.map((t) => NAME[t.type])
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}
