// Lesson model for the Academy. Content lives in lessons.ts; every position and line in it is
// checked by `npm run verify:lessons` (legality, facts, and engine agreement).
import type { Color, PieceSymbol, Square } from 'chess.js'

export type Tone = 'good' | 'bad' | 'hint'
export type Arrow = { from: Square; to: Square; tone: Tone }
export type Mark = { square: Square; tone: Tone }

/** Instruction text, with an optional simpler version for Kids mode. */
type Said = { text: string; kids?: string }

/** Read-only board with arrows/marks, then "Next". */
export type InfoStep = Said & {
  kind: 'info'
  fen?: string
  arrows?: Arrow[]
  marks?: Mark[]
  orientation?: Color
}

/**
 * Move your piece(s) to collect every star and capture every black piece. Black never moves.
 * The best possible number of moves is computed, so extra moves lower the lesson's stars.
 */
export type CollectStep = Said & {
  kind: 'collect'
  fen: string // always White to move; kings optional
  stars: Square[]
}

/**
 * Find the right move(s). `line` alternates player move / opponent reply (SAN; "A|B" accepts either).
 * `any` accepts any move that gives check / checkmate (one-move steps only).
 * `verify`: how strictly the checker compares the player's moves with the engine
 *   best = the engine's choice (puzzles) · book = a sound move (openings) · legal = rules only.
 */
export type MovesStep = Said & {
  kind: 'moves'
  fen: string
  line: string[]
  any?: 'check' | 'mate'
  /** the first move of `line` is the opponent's (e.g. Black openings) */
  opponentFirst?: boolean
  /** shown after line[i] is played */
  notes?: (string | undefined)[]
  hint?: string
  done?: string
  verify?: 'best' | 'book' | 'legal'
  orientation?: Color
}

/**
 * Play on against the engine until the goal is reached.
 * mate · promote (a pawn) · capture (every enemy piece but the king) · hold (survive `within` moves)
 */
export type GoalStep = Said & {
  kind: 'goal'
  fen: string
  goal: 'mate' | 'promote' | 'capture' | 'hold'
  /** player moves allowed (mate/promote/capture) or to survive (hold) */
  within?: number
  hint?: string
  done?: string
  orientation?: Color
}

/** A question about a position. `fact` lets the checker confirm the answer with the rules. */
export type ChoiceStep = Said & {
  kind: 'choice'
  fen: string
  options: string[]
  answer: number
  explain: string
  fact?: 'check' | 'not-check' | 'mate' | 'stalemate' | 'can-castle-k' | 'cannot-castle-k'
  arrows?: Arrow[]
  marks?: Mark[]
  orientation?: Color
}

export type Step = InfoStep | CollectStep | MovesStep | GoalStep | ChoiceStep

export type Lesson = {
  id: string
  title: string
  kidsTitle?: string
  piece: PieceSymbol // icon on the map
  about: string
  steps: Step[]
}

export type Chapter = {
  id: string
  title: string
  kidsTitle?: string
  about: string
  hue: number
  lessons: Lesson[]
}
