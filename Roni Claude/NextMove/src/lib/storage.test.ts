import { beforeEach, describe, expect, it } from 'vitest'
import { loadCurrentGame, loadHistory, loadReviewGame } from '../chess/saved'
import { loadDeck } from '../mistakes/deck'
import { loadProgress } from '../academy/progress'
import { loadStats } from '../puzzles/model'

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

const put = (key: string, raw: string) => mem.set('nextmove:' + key, raw)
const BAD = ['5', '"x"', '{}', '[]', 'null', '[1,"a",null]', '{"a":{"b":1}}', 'not json']

// QA I: saved data of the wrong shape used to blank whole screens.
describe('saved data of the wrong shape reads as empty', () => {
  beforeEach(() => mem.clear())

  it.each(BAD)('%s', (raw) => {
    for (const k of ['computer-current', 'review-game']) put(k, raw)
    for (const k of ['computer-history', 'mistakes', 'academy-progress', 'puzzle-stats']) put(k, raw)
    expect(loadCurrentGame()).toBeNull()
    expect(loadReviewGame()).toBeNull()
    expect(loadHistory()).toEqual([])
    expect(loadDeck()).toEqual([])
    expect(typeof loadProgress()).toBe('object')
    expect(Array.isArray(loadProgress())).toBe(false)
    expect(typeof loadStats().rating).toBe('number')
  })

  it('keeps the good items of a list and drops the broken ones', () => {
    const game = { botId: 'pip', color: 'w', result: 'win', kind: 'checkmate', moves: 9, tc: null, at: 1, pgn: '1. e4' }
    put('computer-history', JSON.stringify([game, 7, { botId: 3 }, null]))
    expect(loadHistory()).toEqual([game])
  })

  it('drops fields and entries that have the right shape but nonsense values', () => {
    const card = { id: 'x', fen: 'garbage fen', best: 'e2e4', bestSan: 'e4', played: 'd4', why: 'w', box: 0, due: 0 }
    put('mistakes', JSON.stringify([card]))
    expect(loadDeck()).toEqual([])
    put('puzzle-stats', JSON.stringify({ rating: 'high', history: 5, solved: ['a', 3], streak: null, rushBest: 12 }))
    expect(loadStats()).toMatchObject({ rating: 800, history: [], solved: ['a'], streak: { days: 0, last: null }, rushBest: 12 })
    put('academy-progress', JSON.stringify({ pawn: 'many', rook: 3, knight: 9, 'no-such-lesson': 3 }))
    expect(loadProgress()).toEqual({ rook: 3 })
  })

  it('still reads a valid saved game', () => {
    const g = { config: { botId: 'pip', choice: 'w', color: 'w', tc: null }, moves: ['e4', 'e5'], clock: null }
    put('computer-current', JSON.stringify(g))
    expect(loadCurrentGame()).toEqual(g)
  })
})
