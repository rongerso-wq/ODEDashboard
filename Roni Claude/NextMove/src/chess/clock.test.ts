import { describe, expect, it } from 'vitest'
import { MIN_THINK, afterMove, formatClock, newClock, pause, remaining, thinkTime, timeControlById } from './clock'
import { parseInfo, parseUci } from '../engine/engine'
import { randomMove } from '../engine/bots'
import { Chess } from 'chess.js'

describe('clock', () => {
  const tc = timeControlById('3+2')!

  it('first move starts the opponent clock without charging the mover', () => {
    const s = afterMove(newClock(tc), 'w', 1000)
    expect(s.w).toBe(180_000)
    expect(s.running).toBe('b')
    expect(remaining(s, 'b', 6000)).toBe(175_000)
  })

  it('charges thinking time and adds the increment', () => {
    let s = afterMove(newClock(tc), 'w', 0) // black to move at t=0
    s = afterMove(s, 'b', 10_000) // black thought 10 s
    expect(s.b).toBe(180_000 - 10_000 + 2000)
    expect(s.running).toBe('w')
  })

  it('never adds time when the display tick is older than the move', () => {
    const s = afterMove(newClock(tc), 'w', 5000)
    expect(remaining(s, 'b', 4900)).toBe(180_000)
  })

  it('pause freezes the running side', () => {
    const s = pause(afterMove(newClock(tc), 'w', 0), 4000)
    expect(s.running).toBe(null)
    expect(remaining(s, 'b', 99_999)).toBe(176_000)
  })

  it('formats times', () => {
    expect(formatClock(300_000)).toBe('5:00')
    expect(formatClock(61_001)).toBe('1:02')
    expect(formatClock(9_340)).toBe('0:09.3')
    expect(formatClock(3_600_000)).toBe('1:00:00')
    expect(formatClock(-5)).toBe('0:00.0')
  })
})

describe('engine protocol', () => {
  it('parses info lines', () => {
    expect(parseInfo('info depth 12 seldepth 18 multipv 2 score cp -35 nodes 1 nps 1 pv e7e5 g1f3')).toEqual({
      multipv: 2,
      depth: 12,
      score: { cp: -35 },
      pv: ['e7e5', 'g1f3'],
    })
    expect(parseInfo('info depth 5 score mate 3 pv h5f7')?.score).toEqual({ mate: 3 })
    expect(parseInfo('info depth 5 score cp 20 lowerbound pv e2e4')).toBeNull()
    expect(parseInfo('info string NNUE evaluation enabled')).toBeNull()
  })

  it('parses UCI moves', () => {
    expect(parseUci('e7e8q')).toEqual({ from: 'e7', to: 'e8', promotion: 'q' })
    expect(parseUci('g1f3')).toEqual({ from: 'g1', to: 'f3', promotion: undefined })
  })
})

describe('bots', () => {
  it('random move is always legal', () => {
    const c = new Chess()
    for (let i = 0; i < 60 && !c.isGameOver(); i++) c.move(randomMove(c)!)
    expect(c.history().length).toBeGreaterThan(0)
  })
})

describe('bot thinking time in clock games', () => {
  const base = { remaining: 60_000, increment: 0, ply: 20, level: 4, legalMoves: 30, sharp: false }
  const mid = () => 0.5

  // Plays a whole game's worth of bot moves and returns the time the bot has left.
  const leftAfter = (minutes: number, increment: number, moves: number, level: number) => {
    let remaining = minutes * 60_000
    let seed = 7
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    for (let i = 0; i < moves && remaining > 0; i++) {
      const t = thinkTime({ ...base, remaining, increment, ply: i * 2, level }, rand)
      remaining = Math.max(0, remaining - t) + (remaining > t ? increment : 0)
    }
    return remaining
  }

  it('uses a real share of the clock: a 1-minute bot is well under half its time after 40 moves', () => {
    for (const level of [1, 4, 8]) {
      const left = leftAfter(1, 0, 40, level)
      expect(left).toBeLessThan(40_000) // it used to keep ~54 s of its 60
      expect(left).toBeGreaterThan(5_000) // and it doesn't throw the game away on time either
    }
  })

  it('also in 3 min + 2 s and 5 min games', () => {
    expect(leftAfter(3, 2, 40, 4)).toBeLessThan(170_000)
    expect(leftAfter(5, 0, 40, 4)).toBeLessThan(200_000)
  })

  it('is quick in the opening and on a forced move, slower in a sharp position', () => {
    const normal = thinkTime(base, mid)
    expect(thinkTime({ ...base, ply: 4 }, mid)).toBeLessThan(normal)
    expect(thinkTime({ ...base, legalMoves: 1 }, mid)).toBeLessThan(normal)
    expect(thinkTime({ ...base, sharp: true }, mid)).toBeGreaterThan(normal)
  })

  it('the beginner bots think longest', () => {
    expect(thinkTime({ ...base, level: 1 }, mid)).toBeGreaterThan(thinkTime({ ...base, level: 8 }, mid))
  })

  it('speeds up when short of time, but never below the floor, so it can lose on time', () => {
    expect(thinkTime({ ...base, remaining: 8000 }, mid)).toBeLessThan(thinkTime(base, mid))
    expect(thinkTime({ ...base, remaining: 600 }, mid)).toBe(MIN_THINK)
    expect(leftAfter(1, 0, 400, 4)).toBe(0)
  })

  it('never keeps the player waiting long in slow games', () => {
    for (let r = 0; r < 1; r += 0.05)
      expect(thinkTime({ ...base, remaining: 30 * 60_000, level: 1, sharp: true }, () => r)).toBeLessThanOrEqual(10_500)
  })
})
