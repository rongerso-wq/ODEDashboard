import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import { checkedKing, legalDests, material, outcomeOf, soundFor, timeoutOutcome } from './game'

const play = (chess: Chess, ...moves: string[]) => moves.map((m) => chess.move(m)).at(-1)!

describe('rules helpers', () => {
  it('lists legal destinations for the side to move', () => {
    const d = legalDests(new Chess())
    expect(d.get('e2')).toEqual(['e3', 'e4'])
    expect(d.get('g1')?.sort()).toEqual(['f3', 'h3'])
    expect(d.has('e7')).toBe(false)
  })

  it('castling is offered and plays as a castle', () => {
    const c = new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1')
    expect(legalDests(c).get('e1')).toEqual(expect.arrayContaining(['g1', 'c1']))
    const m = c.move({ from: 'e1', to: 'g1' })
    expect(soundFor(m, c)).toBe('castle')
    expect(c.get('f1')).toEqual({ type: 'r', color: 'w' })
  })

  it('en passant is legal right after the double step', () => {
    const c = new Chess()
    play(c, 'e4', 'a6', 'e5', 'd5')
    expect(legalDests(c).get('e5')).toContain('d6')
    const m = c.move({ from: 'e5', to: 'd6' })
    expect(m.isEnPassant()).toBe(true)
    expect(c.get('d5')).toBeUndefined()
  })

  it('promotion to any piece', () => {
    const c = new Chess('8/P6k/8/8/8/8/8/K7 w - - 0 1')
    c.move({ from: 'a7', to: 'a8', promotion: 'n' })
    expect(c.get('a8')).toEqual({ type: 'n', color: 'w' })
  })

  it("detects checkmate (Scholar's mate) and the checked king", () => {
    const c = new Chess()
    play(c, 'e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6', 'Qxf7#')
    expect(outcomeOf(c)).toEqual({ kind: 'checkmate', winner: 'w' })
    expect(checkedKing(c)).toBe('e8')
  })

  it('detects stalemate', () => {
    const c = new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')
    expect(outcomeOf(c)).toEqual({ kind: 'stalemate', winner: null })
  })

  it('detects threefold repetition', () => {
    const c = new Chess()
    play(c, 'Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1', 'Ng8')
    expect(outcomeOf(c)?.kind).toBe('threefold')
  })

  it('detects insufficient material', () => {
    expect(outcomeOf(new Chess('8/8/8/8/8/2k5/8/K1B5 w - - 0 1'))?.kind).toBe('insufficient')
  })

  it('timeout is a loss unless the opponent cannot mate', () => {
    expect(timeoutOutcome(new Chess(), 'w')).toEqual({ kind: 'timeout', winner: 'b' })
    expect(timeoutOutcome(new Chess('8/8/8/8/8/2k5/8/K1Q5 w - - 0 1'), 'b')).toEqual({ kind: 'timeout', winner: 'w' })
    expect(timeoutOutcome(new Chess('8/8/8/8/8/2k5/8/K1Q5 w - - 0 1'), 'w')).toEqual({ kind: 'timeout', winner: null })
    expect(timeoutOutcome(new Chess('8/8/8/8/8/2k5/8/K1N5 w - - 0 1'), 'b')).toEqual({ kind: 'timeout', winner: null })
  })

  it('counts captured pieces and the material lead', () => {
    const c = new Chess()
    play(c, 'e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5', 'Nb5', 'Qxb5', 'Bxb5+')
    const m = material(c)
    expect(m.captured.w).toEqual(['q', 'p'])
    expect(m.captured.b).toEqual(['n', 'p'])
    expect(m.diff).toBe(6)
  })
})
