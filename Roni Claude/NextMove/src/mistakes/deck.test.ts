import { beforeEach, describe, expect, it } from 'vitest'
import { addCards, cardFromFeedback, deckStats, dueCards, INTERVALS, loadDeck, MASTERED, review } from './deck'
import type { Feedback } from '../coach/explain'

// vitest runs in Node: a minimal localStorage
const mem = new Map<string, string>()
globalThis.localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
} as Storage

const fb = (over: Partial<Feedback> = {}): Feedback => ({
  grade: 'blunder',
  title: 'Blunder',
  text: 'The queen on h5 can be taken — Pip plays gxh5. Better was d4.',
  san: 'Qh5',
  playedUci: 'd1h5',
  bestUci: 'd2d4',
  bestSan: 'd4',
  before: 'rnbqkbnr/pppppp1p/6p1/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
  after: 'x',
  evalBefore: 40,
  evalAfter: -850,
  ...over,
})

describe('mistake deck', () => {
  beforeEach(() => mem.clear())

  it('only real mistakes become cards', () => {
    expect(cardFromFeedback(fb(), 'Pip')).not.toBeNull()
    expect(cardFromFeedback(fb({ grade: 'inaccuracy' }), 'Pip')).toBeNull()
    expect(cardFromFeedback(fb({ grade: 'best' }), 'Pip')).toBeNull()
  })

  it('never stores the same mistake twice', () => {
    const c = cardFromFeedback(fb(), 'Pip', 1000)!
    expect(addCards([c])).toBe(1)
    expect(addCards([{ ...c, at: 2000 }])).toBe(0)
    expect(loadDeck()).toHaveLength(1)
  })

  it('spaces reviews out, and a miss starts over', () => {
    const c = cardFromFeedback(fb(), 'Pip', 0)!
    addCards([c])
    expect(dueCards(loadDeck(), 0)).toHaveLength(1)
    const r1 = review(c, true, 0)
    expect(r1.box).toBe(1)
    expect(r1.due).toBe(INTERVALS[1])
    expect(dueCards(loadDeck(), 1000)).toHaveLength(0) // not due again today
    const r2 = review(r1, true, INTERVALS[1])
    expect(r2.box).toBe(2)
    const missed = review(r2, false, INTERVALS[1] + 5)
    expect(missed.box).toBe(0)
    expect(dueCards(loadDeck(), INTERVALS[1] + 5)).toHaveLength(1) // back in this session
  })

  it('a card solved five times is mastered and leaves the queue', () => {
    let c = cardFromFeedback(fb(), 'Pip', 0)!
    addCards([c])
    let t = 0
    for (let i = 0; i < MASTERED; i++) {
      c = review(c, true, t)
      t = c.due
    }
    expect(c.box).toBe(MASTERED)
    expect(deckStats(loadDeck(), t + 1e12)).toMatchObject({ total: 1, due: 0, mastered: 1 })
  })
})
