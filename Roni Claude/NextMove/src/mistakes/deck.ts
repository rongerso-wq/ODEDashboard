// "My mistakes": every mistake or blunder from the player's own games becomes a card that comes
// back on a spaced-repetition schedule until it is solved several times in a row.
import type { Feedback } from '../coach/explain'
import { validateFen } from 'chess.js'
import { loadList, save } from '../lib/storage'

export type MistakeCard = {
  id: string // position + best move, so the same mistake is never stored twice
  fen: string // position before the mistake (the player to move)
  best: string // engine's move, UCI
  bestSan: string
  played: string // SAN of the move that was played
  grade: 'mistake' | 'blunder'
  evalBest: number // centipawns for the player, after the best move
  why: string // what was wrong with the played move (coach text)
  opponent: string
  at: number // when it happened
  box: number // 0 = new / just missed … 5 = mastered
  due: number // timestamp
  reviews: number
}

const KEY = 'mistakes'
const MAX_CARDS = 200
const DAY = 86_400_000
/** Wait after a success in box n (index = new box). Box 0 comes back in the same session. */
export const INTERVALS = [0, 1 * DAY, 3 * DAY, 7 * DAY, 21 * DAY, 60 * DAY]
export const MASTERED = 5

export const loadDeck = () =>
  loadList<MistakeCard>(KEY, (c) =>
    ['id', 'fen', 'best', 'bestSan', 'played', 'why'].every((k) => typeof c[k] === 'string') &&
    ['box', 'due'].every((k) => typeof c[k] === 'number') &&
    validateFen(c.fen as string).ok)
const saveDeck = (d: MistakeCard[]) => save(KEY, d)

/** Turns a coach verdict into a card (null if it wasn't a real mistake). */
export function cardFromFeedback(fb: Feedback, opponent: string, now = Date.now()): MistakeCard | null {
  if ((fb.grade !== 'mistake' && fb.grade !== 'blunder') || !fb.bestUci || !fb.bestSan) return null
  return {
    id: `${fb.before.split(' ').slice(0, 4).join(' ')}|${fb.bestUci}`,
    fen: fb.before,
    best: fb.bestUci,
    bestSan: fb.bestSan,
    played: fb.san,
    grade: fb.grade,
    evalBest: fb.evalBefore,
    why: fb.text,
    opponent,
    at: now,
    box: 0,
    due: now,
    reviews: 0,
  }
}

/** Adds cards that aren't in the deck yet; returns how many were new. */
export function addCards(cards: MistakeCard[]): number {
  const deck = loadDeck()
  const known = new Set(deck.map((c) => c.id))
  const fresh = cards.filter((c) => !known.has(c.id))
  if (!fresh.length) return 0
  let next = [...deck, ...fresh]
  if (next.length > MAX_CARDS) {
    // make room: drop mastered cards first, then the oldest
    next = next.sort((a, b) => Number(b.box >= MASTERED) - Number(a.box >= MASTERED) || a.at - b.at).slice(next.length - MAX_CARDS)
  }
  saveDeck(next)
  return fresh.length
}

export function dueCards(deck = loadDeck(), now = Date.now()): MistakeCard[] {
  return deck.filter((c) => c.box < MASTERED && c.due <= now).sort((a, b) => a.due - b.due || a.at - b.at)
}

/** Records one attempt: solved at the first try moves the card up a box, otherwise back to box 0. */
export function review(card: MistakeCard, solved: boolean, now = Date.now()): MistakeCard {
  const box = solved ? Math.min(MASTERED, card.box + 1) : 0
  const updated = { ...card, box, due: now + INTERVALS[Math.min(box, INTERVALS.length - 1)], reviews: card.reviews + 1 }
  saveDeck(loadDeck().map((c) => (c.id === card.id ? updated : c)))
  return updated
}

export function deckStats(deck = loadDeck(), now = Date.now()) {
  return {
    total: deck.length,
    due: dueCards(deck, now).length,
    mastered: deck.filter((c) => c.box >= MASTERED).length,
    learning: deck.filter((c) => c.box < MASTERED).length,
  }
}
