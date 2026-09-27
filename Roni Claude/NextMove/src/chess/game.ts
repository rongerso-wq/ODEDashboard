import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js'

export type { Color, Move, PieceSymbol, Square }

export type OutcomeKind =
  | 'checkmate'
  | 'stalemate'
  | 'threefold'
  | 'insufficient'
  | 'fifty'
  | 'resign'
  | 'agreement'
  | 'timeout'

export type Outcome = {
  kind: OutcomeKind
  winner: Color | null // null = draw
}

export const colorName = (c: Color) => (c === 'w' ? 'White' : 'Black')
export const other = (c: Color): Color => (c === 'w' ? 'b' : 'w')

/** The rules-based result of the position, or null while the game is still going. */
export function outcomeOf(chess: Chess): Outcome | null {
  if (chess.isCheckmate()) return { kind: 'checkmate', winner: other(chess.turn()) }
  if (chess.isStalemate()) return { kind: 'stalemate', winner: null }
  if (chess.isInsufficientMaterial()) return { kind: 'insufficient', winner: null }
  if (chess.isThreefoldRepetition()) return { kind: 'threefold', winner: null }
  if (chess.isDrawByFiftyMoves()) return { kind: 'fifty', winner: null }
  return null
}

export function outcomeText(o: Outcome, kids = false): { title: string; detail: string } {
  const who = o.winner ? colorName(o.winner) : ''
  switch (o.kind) {
    case 'checkmate':
      return {
        title: kids ? `Checkmate! ${who} wins! 🎉` : `Checkmate — ${who} wins`,
        detail: kids ? "The king is trapped and can't escape." : 'The king is attacked and has no legal move.',
      }
    case 'resign':
      return { title: `${who} wins`, detail: `${colorName(other(o.winner!))} resigned.` }
    case 'stalemate':
      return {
        title: kids ? "It's a tie — stalemate!" : 'Draw by stalemate',
        detail: kids
          ? "The player to move isn't in check but has no moves left."
          : 'The side to move is not in check and has no legal move.',
      }
    case 'insufficient':
      return { title: 'Draw', detail: 'Neither side has enough pieces left to checkmate.' }
    case 'threefold':
      return { title: 'Draw by repetition', detail: 'The same position appeared three times.' }
    case 'fifty':
      return { title: 'Draw — fifty-move rule', detail: 'Fifty moves each without a capture or a pawn move.' }
    case 'agreement':
      return { title: 'Draw agreed', detail: 'Both players agreed to a draw.' }
    case 'timeout':
      return o.winner
        ? { title: `${who} wins on time`, detail: `${colorName(other(o.winner))} ran out of time.` }
        : { title: 'Draw — time out', detail: 'Time ran out, but the other side had too few pieces to ever checkmate.' }
  }
}

/** Result when `flagged` runs out of time: a loss, unless the opponent could never checkmate. */
export function timeoutOutcome(chess: Chess, flagged: Color): Outcome {
  const winner = other(flagged)
  const mine: PieceSymbol[] = []
  let loserHasOnlyKing = true
  for (const row of chess.board())
    for (const p of row) {
      if (!p || p.type === 'k') continue
      if (p.color === winner) mine.push(p.type)
      else loserHasOnlyKing = false
    }
  const cannotMate = mine.length === 0 || (loserHasOnlyKing && mine.length === 1 && (mine[0] === 'n' || mine[0] === 'b'))
  return cannotMate ? { kind: 'timeout', winner: null } : { kind: 'timeout', winner }
}

/** Legal destinations for every piece of the side to move. */
export function legalDests(chess: Chess): Map<Square, Square[]> {
  const dests = new Map<Square, Square[]>()
  for (const m of chess.moves({ verbose: true })) {
    const list = dests.get(m.from)
    if (list) {
      if (!list.includes(m.to)) list.push(m.to)
    } else dests.set(m.from, [m.to])
  }
  return dests
}

/** Square of the king that is currently in check, if any. */
export function checkedKing(chess: Chess): Square | null {
  if (!chess.inCheck()) return null
  const turn = chess.turn()
  for (const row of chess.board())
    for (const p of row) if (p && p.type === 'k' && p.color === turn) return p.square
  return null
}

const START_COUNT: Record<Exclude<PieceSymbol, 'k'>, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 }
const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }
const ORDER: Exclude<PieceSymbol, 'k'>[] = ['q', 'r', 'b', 'n', 'p']

export type Material = {
  /** pieces each side has captured (i.e. missing from the other side), most valuable first */
  captured: Record<Color, PieceSymbol[]>
  /** material lead of white in pawns (negative = black leads) */
  diff: number
}

export function material(chess: Chess): Material {
  const count: Record<Color, Record<PieceSymbol, number>> = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
  }
  for (const row of chess.board()) for (const p of row) if (p) count[p.color][p.type]++

  const captured: Record<Color, PieceSymbol[]> = { w: [], b: [] }
  for (const t of ORDER) {
    for (let i = count.b[t]; i < START_COUNT[t]; i++) captured.w.push(t)
    for (let i = count.w[t]; i < START_COUNT[t]; i++) captured.b.push(t)
  }
  let diff = 0
  for (const t of ORDER) diff += (count.w[t] - count.b[t]) * VALUE[t]
  return { captured, diff }
}

export function soundFor(m: Move, chess: Chess): 'move' | 'capture' | 'check' | 'castle' {
  if (chess.inCheck()) return 'check'
  if (m.isKingsideCastle() || m.isQueensideCastle()) return 'castle'
  if (m.isCapture()) return 'capture'
  return 'move'
}
