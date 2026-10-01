import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import { dailyPuzzle, loadPuzzles, newRating, nextRated, rushPuzzle, themeSet, THEMES, type PuzzleStats } from './model'

const stats = (rating: number, tried: string[] = []): PuzzleStats => ({
  rating,
  games: 30,
  solved: [],
  tried,
  history: [],
  streak: { days: 0, last: null },
  rushBest: 0,
  daily: null,
})

describe('puzzle data', async () => {
  const all = await loadPuzzles()

  it('has a good spread of puzzles', () => {
    expect(all.length).toBeGreaterThan(1000)
    expect(Math.min(...all.map((p) => p.rating))).toBeLessThan(700)
    expect(Math.max(...all.map((p) => p.rating))).toBeGreaterThan(2400)
    for (const t of THEMES) expect(themeSet(all, t.id).length, t.id).toBeGreaterThanOrEqual(40)
  })

  it('every puzzle replays legally, and the last player move of a mate puzzle mates', () => {
    for (const p of all) {
      const c = new Chess(p.fen)
      for (const uci of p.moves) c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
      if (p.themes.includes('mateIn1') || p.themes.includes('mateIn2')) expect(c.isCheckmate(), p.id).toBe(true)
    }
  })

  it('serves rated puzzles near the rating and never repeats one', () => {
    const p = nextRated(all, stats(1200), () => 0.5)
    expect(Math.abs(p.rating - 1200)).toBeLessThanOrEqual(60)
    expect(nextRated(all, stats(1200, [p.id]), () => 0.5).id).not.toBe(p.id)
  })

  it('once every puzzle is played, serves one of those played longest ago', () => {
    const order = all.map((p) => p.id) // oldest first
    const p = nextRated(all, stats(1200, order), () => 0.5)
    expect(order.indexOf(p.id)).toBeLessThan(order.length / 4)
  })

  it('daily puzzle is stable for a date and approachable', () => {
    const a = dailyPuzzle(all, '2026-09-27')
    expect(dailyPuzzle(all, '2026-09-27').id).toBe(a.id)
    expect(a.rating).toBeGreaterThanOrEqual(700)
    expect(a.rating).toBeLessThanOrEqual(1400)
  })

  it('rush gets harder', () => {
    const used = new Set<string>()
    expect(rushPuzzle(all, 0, used, () => 0.5).rating).toBeLessThan(760)
    expect(rushPuzzle(all, 20, used, () => 0.5).rating).toBeGreaterThan(1400)
  })
})

describe('rating', () => {
  it('rises for a win against a harder puzzle, falls for a loss to an easier one', () => {
    expect(newRating(1000, 1200, true, 30)).toBeGreaterThan(1000)
    expect(newRating(1000, 800, false, 30)).toBeLessThan(1000)
    expect(newRating(1000, 1000, true, 5) - 1000).toBe(24) // provisional: bigger steps
  })
})
