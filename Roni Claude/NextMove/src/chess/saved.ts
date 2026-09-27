import type { Color } from 'chess.js'
import type { ClockState } from './clock'
import type { OutcomeKind } from './game'
import { load, save } from '../lib/storage'

export type ComputerConfig = {
  botId: string
  /** the side the player chose; 'random' is resolved when the game starts */
  choice: Color | 'random'
  color: Color
  tc: string | null // time-control id, null = no clock
}

export type SavedComputerGame = {
  config: ComputerConfig
  moves: string[] // SAN
  clock: ClockState | null // stored paused
}

export type FinishedGame = {
  botId: string
  color: Color
  result: 'win' | 'loss' | 'draw'
  kind: OutcomeKind
  moves: number
  tc: string | null
  at: number
  pgn: string
}

const CURRENT = 'computer-current'
const HISTORY = 'computer-history'
const MAX_HISTORY = 30

export const loadCurrentGame = () => load<SavedComputerGame | null>(CURRENT, null)
export const saveCurrentGame = (g: SavedComputerGame | null) => save(CURRENT, g)

export const loadHistory = () => load<FinishedGame[]>(HISTORY, [])
export function addToHistory(g: FinishedGame) {
  save(HISTORY, [g, ...loadHistory()].slice(0, MAX_HISTORY))
}

/** A finished game handed to the review screen. `me` = the side the coach talks to (null: both). */
export type ReviewGame = {
  moves: string[]
  white: string
  black: string
  me: Color | null
  result: string
  /** set for games against a bot: lets "Try again from here" start a new game */
  config?: ComputerConfig
}

export const loadReviewGame = () => load<ReviewGame | null>('review-game', null)
export const saveReviewGame = (g: ReviewGame) => save('review-game', g)

/** ids of bots the player has beaten at least once */
export function beatenBots(): Set<string> {
  return new Set(loadHistory().filter((g) => g.result === 'win').map((g) => g.botId))
}
