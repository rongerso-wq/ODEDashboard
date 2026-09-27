// QA A1: the full set of chess rules, through the helpers the app uses (legalDests / outcomeOf).
import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import { legalDests, outcomeOf, outcomeText } from './game'

const dests = (fen: string, from: string) => legalDests(new Chess(fen)).get(from as never) ?? []

describe('castling conditions', () => {
  const base = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1'
  it('both sides allowed on an open back rank', () => {
    expect(dests(base, 'e1')).toEqual(expect.arrayContaining(['g1', 'c1']))
  })
  it('not while in check', () => {
    expect(dests('r3k2r/8/8/8/8/8/4r3/R3K2R w KQkq - 0 1', 'e1')).not.toContain('g1')
    expect(dests('r3k2r/8/8/8/8/8/4r3/R3K2R w KQkq - 0 1', 'e1')).not.toContain('c1')
  })
  it('not through an attacked square (f1) or into one (g1)', () => {
    expect(dests('r3k2r/8/8/8/2b5/8/8/R3K2R w KQkq - 0 1', 'e1')).not.toContain('g1') // Bc4 hits f1
    expect(dests('r3k2r/8/8/8/8/7b/8/R3K2R w KQkq - 0 1', 'e1')).not.toContain('g1') // Bh3 hits f1 via g2
    expect(dests('r3k2r/8/8/8/8/8/6r1/R3K2R w KQkq - 0 1', 'e1')).not.toContain('g1') // Rg2 hits g1
  })
  it('queenside may castle when only b1 is attacked (the king never crosses b1)', () => {
    expect(dests('r3k2r/8/8/8/8/8/1r6/R3K2R w KQkq - 0 1', 'e1')).toContain('c1')
  })
  it('not with a piece in between', () => {
    expect(dests('r3k2r/8/8/8/8/8/8/R3KB1R w KQkq - 0 1', 'e1')).not.toContain('g1')
    expect(dests('r3k2r/8/8/8/8/8/8/RN2K2R w KQkq - 0 1', 'e1')).not.toContain('c1')
  })
  it('not after the king or that rook has moved', () => {
    const c = new Chess(base)
    c.move('Kf1')
    c.move('Kf8')
    c.move('Ke1')
    c.move('Ke8')
    expect(legalDests(c).get('e1')).not.toContain('g1')
    const r = new Chess(base)
    r.move('Rh2')
    r.move('Rh7')
    r.move('Rh1')
    r.move('Rh8')
    expect(legalDests(r).get('e1')).not.toContain('g1')
    expect(legalDests(r).get('e1')).toContain('c1') // the other rook still can
  })
})

describe('promotion', () => {
  it.each(['q', 'r', 'b', 'n'] as const)('to %s', (p) => {
    const c = new Chess('8/P6k/8/8/8/8/8/K7 w - - 0 1')
    c.move({ from: 'a7', to: 'a8', promotion: p })
    expect(c.get('a8')).toEqual({ type: p, color: 'w' })
  })
  it('capturing promotion', () => {
    const c = new Chess('1r5k/P7/8/8/8/8/8/K7 w - - 0 1')
    expect(legalDests(c).get('a7')).toEqual(expect.arrayContaining(['a8', 'b8']))
    c.move({ from: 'a7', to: 'b8', promotion: 'q' })
    expect(c.get('b8')).toEqual({ type: 'q', color: 'w' })
  })
})

describe('draw rules', () => {
  it('fifty-move rule', () => {
    const c = new Chess('8/8/8/4k3/8/8/4K3/7R w - - 99 80')
    expect(outcomeOf(c)).toBeNull()
    c.move('Rh2')
    expect(outcomeOf(c)).toEqual({ kind: 'fifty', winner: null })
    expect(outcomeText(outcomeOf(c)!).title).toBe('Draw — fifty-move rule')
  })
  it('insufficient material: K+B v K, K+N v K, K v K; but K+R v K is not', () => {
    expect(outcomeOf(new Chess('8/8/8/4k3/8/8/4K3/5B2 w - - 0 1'))?.kind).toBe('insufficient')
    expect(outcomeOf(new Chess('8/8/8/4k3/8/8/4K3/5N2 w - - 0 1'))?.kind).toBe('insufficient')
    expect(outcomeOf(new Chess('8/8/8/4k3/8/8/4K3/8 w - - 0 1'))?.kind).toBe('insufficient')
    expect(outcomeOf(new Chess('8/8/8/4k3/8/8/4K3/5R2 w - - 0 1'))).toBeNull()
  })
  it('checkmate beats the fifty-move counter', () => {
    const c = new Chess('7k/8/6K1/8/8/8/8/R7 w - - 99 80')
    c.move('Ra8#')
    expect(outcomeOf(c)?.kind).toBe('checkmate')
  })
})

describe('en passant edge cases', () => {
  it('only right after the double step', () => {
    const c = new Chess()
    for (const m of ['e4', 'a6', 'e5', 'd5']) c.move(m)
    expect(legalDests(c).get('e5')).toContain('d6')
    c.move('a3')
    c.move('a5')
    expect(legalDests(c).get('e5') ?? []).not.toContain('d6')
  })
  it('not when it would expose the own king (pinned along the rank)', () => {
    // White Ka5, pawn b5; black pawn c7-c5; black rook h5: bxc6 would leave the king in check
    const c = new Chess('4k3/2p5/8/KP5r/8/8/8/8 b - - 0 1')
    c.move('c5')
    expect(legalDests(c).get('b5') ?? []).not.toContain('c6')
  })
})
