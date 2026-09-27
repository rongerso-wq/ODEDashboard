// Puzzle data, the player's puzzle rating and progress. Puzzles come from the Lichess puzzle
// database (CC0), built by scripts/build-puzzles.mjs into puzzles.json (loaded on demand).
import type { PieceSymbol } from 'chess.js'
import { load, save } from '../lib/storage'

export type Puzzle = {
  id: string
  /** position before the opponent's first move */
  fen: string
  /** UCI; moves[0] is the opponent's move, then player / opponent alternate */
  moves: string[]
  rating: number
  themes: string[]
}

let cache: Promise<Puzzle[]> | null = null
export function loadPuzzles(): Promise<Puzzle[]> {
  cache ??= import('./puzzles.json').then((m) =>
    (m.default.puzzles as [string, string, string, number, string][]).map(([id, fen, moves, rating, themes]) => ({
      id,
      fen,
      moves: moves.split(' '),
      rating,
      themes: themes.split(' '),
    })),
  )
  return cache
}

export type ThemeInfo = { id: string; title: string; kids: string; about: string; piece: PieceSymbol }

export const THEMES: ThemeInfo[] = [
  { id: 'mateIn1', title: 'Mate in 1', kids: 'Checkmate in one!', about: 'Find the checkmating move.', piece: 'q' },
  { id: 'mateIn2', title: 'Mate in 2', kids: 'Checkmate in two', about: 'Two moves to checkmate.', piece: 'q' },
  { id: 'mateIn3', title: 'Mate in 3', kids: 'Checkmate in three', about: 'Plan three moves ahead.', piece: 'k' },
  { id: 'fork', title: 'Forks', kids: 'Forks', about: 'Attack two pieces at once.', piece: 'n' },
  { id: 'pin', title: 'Pins', kids: 'Pins', about: 'Freeze a piece in place.', piece: 'b' },
  { id: 'skewer', title: 'Skewers', kids: 'Skewers', about: 'Attack through a piece.', piece: 'r' },
  { id: 'discoveredAttack', title: 'Discovered attacks', kids: 'Surprise attacks', about: 'Move one piece, unleash another.', piece: 'b' },
  { id: 'hangingPiece', title: 'Free pieces', kids: 'Free pieces', about: 'Spot the unprotected piece.', piece: 'p' },
  { id: 'backRankMate', title: 'Back-rank mates', kids: 'Back-row mates', about: 'The king trapped behind its pawns.', piece: 'r' },
  { id: 'promotion', title: 'Promotion', kids: 'New queen!', about: 'Push a pawn all the way.', piece: 'p' },
  { id: 'sacrifice', title: 'Sacrifices', kids: 'Brave sacrifices', about: 'Give something to get more.', piece: 'q' },
  { id: 'defensiveMove', title: 'Defence', kids: 'Save the day', about: 'Find the only move that holds.', piece: 'k' },
  { id: 'opening', title: 'Opening traps', kids: 'Early tricks', about: 'Tactics from the first moves.', piece: 'n' },
  { id: 'endgame', title: 'Endgames', kids: 'Endgames', about: 'Precision with few pieces.', piece: 'k' },
]
export const themeById = (id: string) => THEMES.find((t) => t.id === id) ?? null

export type PuzzleMode = { kind: 'rated' } | { kind: 'daily' } | { kind: 'theme'; theme: string }

/** '/puzzles/rated' | '/puzzles/daily' | '/puzzles/theme/<id>' -> mode (null for other routes) */
export function parsePuzzleRoute(route: string): PuzzleMode | null {
  if (route === '/puzzles/rated') return { kind: 'rated' }
  if (route === '/puzzles/daily') return { kind: 'daily' }
  const m = route.match(/^\/puzzles\/theme\/(\w+)$/)
  return m && themeById(m[1]) ? { kind: 'theme', theme: m[1] } : null
}

// ───────────── the player's progress ─────────────
export type PuzzleStats = {
  rating: number
  games: number // rated puzzles played
  solved: string[] // ids solved at the first try (any mode)
  tried: string[] // ids attempted in rated mode (never served again there)
  history: { at: number; rating: number }[]
  streak: { days: number; last: string | null } // days in a row with at least one solved puzzle
  rushBest: number
  daily: { date: string; solved: boolean } | null
}

const START: PuzzleStats = { rating: 800, games: 0, solved: [], tried: [], history: [], streak: { days: 0, last: null }, rushBest: 0, daily: null }

export const loadStats = (): PuzzleStats => ({ ...START, ...load<Partial<PuzzleStats>>('puzzle-stats', {}) })
export const saveStats = (s: PuzzleStats) => save('puzzle-stats', s)

export const today = (d = new Date()) => d.toISOString().slice(0, 10)

/** Elo against the puzzle's rating; faster while the player's rating is still settling. */
export function newRating(player: number, puzzle: number, won: boolean, games: number): number {
  const expected = 1 / (1 + Math.pow(10, (puzzle - player) / 400))
  const k = games < 15 ? 48 : games < 50 ? 32 : 20
  return Math.max(100, Math.round(player + k * ((won ? 1 : 0) - expected)))
}

/** Records one finished puzzle. `rated` changes the rating (only the first attempt counts). */
export function recordResult(p: Puzzle, success: boolean, rated: boolean): { stats: PuzzleStats; delta: number } {
  const s = loadStats()
  let delta = 0
  if (rated && !s.tried.includes(p.id)) {
    const r = newRating(s.rating, p.rating, success, s.games)
    delta = r - s.rating
    s.rating = r
    s.games++
    s.tried = [...s.tried, p.id]
    s.history = [...s.history, { at: Date.now(), rating: r }].slice(-60)
  }
  if (success) {
    if (!s.solved.includes(p.id)) s.solved = [...s.solved, p.id]
    const t = today()
    if (s.streak.last !== t) {
      const yesterday = today(new Date(Date.now() - 86_400_000))
      s.streak = { days: s.streak.last === yesterday ? s.streak.days + 1 : 1, last: t }
    }
  }
  saveStats(s)
  return { stats: s, delta }
}

// ───────────── choosing puzzles ─────────────
/** An unplayed puzzle close to the player's rating (the window widens if needed). */
export function nextRated(all: Puzzle[], stats: PuzzleStats, rand = Math.random): Puzzle {
  const tried = new Set(stats.tried)
  for (let w = 60; w <= 2000; w *= 1.6) {
    const near = all.filter((p) => !tried.has(p.id) && Math.abs(p.rating - stats.rating) <= w)
    if (near.length >= 3 || w * 1.6 > 2000) {
      if (near.length) return near[Math.floor(rand() * near.length)]
    }
  }
  return all[Math.floor(rand() * all.length)]
}

/** The same puzzle for everyone today: a popular, approachable one (rating 700–1400). */
export function dailyPuzzle(all: Puzzle[], date = today()): Puzzle {
  const pool = all.filter((p) => p.rating >= 700 && p.rating <= 1400)
  let h = 0
  for (const ch of date) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return pool[h % pool.length]
}

export const themeSet = (all: Puzzle[], theme: string) => all.filter((p) => p.themes.includes(theme)).sort((a, b) => a.rating - b.rating)

/** Puzzle Rush: the i-th puzzle gets steadily harder, from the easiest (~650). */
export function rushPuzzle(all: Puzzle[], i: number, used: Set<string>, rand = Math.random): Puzzle {
  const target = 650 + i * 55
  const fresh = all.filter((p) => !used.has(p.id) && p.moves.length <= 6)
  const near = fresh.filter((p) => Math.abs(p.rating - target) <= 80)
  if (near.length) return near[Math.floor(rand() * near.length)]
  // nothing that close: the nearest one, never a random (possibly far too hard) puzzle
  return fresh.reduce((a, b) => (Math.abs(b.rating - target) < Math.abs(a.rating - target) ? b : a))
}
