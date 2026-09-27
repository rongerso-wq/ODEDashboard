import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadStats, recordResult, today, type Puzzle } from './model'

const mem = new Map<string, string>()
globalThis.localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
} as Storage

const p = (id: string): Puzzle => ({ id, fen: '', moves: [], rating: 800, themes: [] })

describe('day streak and "today"', () => {
  beforeEach(() => {
    mem.clear()
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  it('today() is the local calendar day, not the UTC one', () => {
    const local = new Date(2026, 8, 28, 0, 30) // 00:30 on 28 Sep, local time
    expect(today(local)).toBe('2026-09-28')
  })

  it('counts consecutive days, ignores a second solve on the same day, resets after a gap', () => {
    vi.setSystemTime(new Date(2026, 8, 27, 20, 0))
    recordResult(p('a'), true, false)
    recordResult(p('b'), true, false)
    expect(loadStats().streak).toEqual({ days: 1, last: '2026-09-27' })
    vi.setSystemTime(new Date(2026, 8, 28, 0, 15)) // just after local midnight
    recordResult(p('c'), true, false)
    expect(loadStats().streak).toEqual({ days: 2, last: '2026-09-28' })
    vi.setSystemTime(new Date(2026, 8, 30, 9, 0)) // skipped the 29th
    recordResult(p('d'), true, false)
    expect(loadStats().streak).toEqual({ days: 1, last: '2026-09-30' })
  })

  it('a failed puzzle does not count towards the streak', () => {
    vi.setSystemTime(new Date(2026, 8, 27, 20, 0))
    recordResult(p('a'), false, false)
    expect(loadStats().streak.days).toBe(0)
  })
})
