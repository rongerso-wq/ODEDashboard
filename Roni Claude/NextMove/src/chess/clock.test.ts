import { describe, expect, it } from 'vitest'
import { afterMove, formatClock, newClock, pause, remaining, timeControlById } from './clock'
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
