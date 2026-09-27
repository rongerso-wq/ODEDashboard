// Move grading from engine evaluations, using win chances (a 1-pawn drop matters far more
// in an equal position than when you're already a queen up). Same curve and thresholds
// Lichess uses for its inaccuracy / mistake / blunder labels.
import type { Score } from '../engine/engine'

export type Grade = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'

export const MATE_CP = 10_000

/** Engine score -> centipawns for the side to move; mates become huge values. */
export function scoreToCp(s: Score): number {
  if ('mate' in s) return s.mate > 0 ? MATE_CP - s.mate : s.mate < 0 ? -MATE_CP - s.mate : -MATE_CP
  return s.cp
}

/** -1 (lost) .. +1 (won) */
export function winChance(cp: number): number {
  return 2 / (1 + Math.exp(-0.00368208 * cp)) - 1
}

export const winPercent = (cp: number) => 50 + 50 * winChance(cp)

/**
 * Grade a move. `before` and `after` are both from the mover's point of view:
 * the best achievable eval before the move and the eval after the move that was played.
 */
export function classify(before: number, after: number, playedBest: boolean): Grade {
  if (playedBest || before - after <= 12) return 'best'
  const drop = winChance(before) - winChance(after)
  if (drop >= 0.3) return 'blunder'
  if (drop >= 0.2) return 'mistake'
  if (drop >= 0.1) return 'inaccuracy'
  return 'good'
}

/** Accuracy of one move, 0–100, from win% before/after (Lichess formula). */
export function moveAccuracy(before: number, after: number): number {
  const drop = Math.max(0, winPercent(before) - winPercent(after))
  return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * drop) - 3.1669))
}

/** "+1.4", "−0.3", "#3", "−#2" (from the given side's point of view) */
export function formatEval(cp: number): string {
  if (Math.abs(cp) >= MATE_CP - 500) {
    const n = MATE_CP - Math.abs(cp)
    return `${cp < 0 ? '−' : ''}#${Math.max(1, n)}`
  }
  const p = cp / 100
  return `${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(p).toFixed(1)}`
}

export const isMate = (cp: number) => Math.abs(cp) >= MATE_CP - 500
export const mateIn = (cp: number) => MATE_CP - Math.abs(cp)

export const GRADE_SYMBOL: Record<Grade, string> = { best: '', good: '', inaccuracy: '?!', mistake: '?', blunder: '??' }
