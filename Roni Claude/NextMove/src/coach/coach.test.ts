import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import { classify, formatEval, MATE_CP, moveAccuracy, scoreToCp } from './grade'
import { hangingPieces, isFork, winsMaterial } from './tactics'
import { explainMove, hintFor, youVoice } from './explain'
import type { Analysis } from './analysis'

const A = (fen: string, cp: number, best: string | null): Analysis => ({ fen, cp, best, pv: best ? [best] : [], depth: 14 })
const voice = youVoice('Pip', false)

describe('grading', () => {
  it('scores mates as huge values', () => {
    expect(scoreToCp({ mate: 1 })).toBe(MATE_CP - 1)
    expect(scoreToCp({ mate: -2 })).toBe(-MATE_CP + 2)
    expect(scoreToCp({ cp: 35 })).toBe(35)
  })

  it('classifies by lost winning chances', () => {
    expect(classify(30, 25, false)).toBe('best')
    expect(classify(30, -20, false)).toBe('good')
    expect(classify(50, -40, false)).toBe('inaccuracy')
    expect(classify(50, -100, false)).toBe('mistake') // 1.5 pawns from equal
    expect(classify(0, -150, false)).toBe('mistake')
    expect(classify(0, -250, false)).toBe('blunder')
    expect(classify(100, -600, false)).toBe('blunder')
    expect(classify(900, 700, false)).toBe('good') // already winning big: small effect
    expect(classify(-40, -300, true)).toBe('best') // the engine's own move is never wrong
  })

  it('formats evaluations', () => {
    expect(formatEval(140)).toBe('+1.4')
    expect(formatEval(-30)).toBe('−0.3')
    expect(formatEval(MATE_CP - 3)).toBe('#3')
    expect(formatEval(-MATE_CP + 2)).toBe('−#2')
  })

  it('accuracy is 100 for a perfect move and low for a blunder', () => {
    expect(moveAccuracy(50, 50)).toBeGreaterThan(99)
    expect(moveAccuracy(50, -900)).toBeLessThan(20)
  })
})

describe('tactics', () => {
  it('finds a hanging piece', () => {
    // White knight on e5 attacked by the d6 pawn, and undefended
    const c = new Chess('4k3/8/3p4/4N3/8/8/8/4K3 b - - 0 1')
    expect(hangingPieces(c, 'w')).toEqual([{ square: 'e5', type: 'n', value: 3, defended: false }])
    expect(hangingPieces(c, 'b')).toEqual([])
  })

  it('marks a defended piece attacked by something cheaper as defended (not "unprotected")', () => {
    // knight on e5 defended by the d4 pawn, attacked by the d6 pawn
    const c = new Chess('4k3/8/3p4/4N3/3P4/8/8/4K3 b - - 0 1')
    expect(hangingPieces(c, 'w')).toEqual([{ square: 'e5', type: 'n', value: 3, defended: true }])
  })

  it('knows a free capture from an even trade', () => {
    const free = new Chess('4k3/8/8/3r4/8/8/8/3RK3 w - - 0 1')
    expect(winsMaterial(free.fen(), free.move('Rxd5'))).toMatchObject({ type: 'r' })
    const trade = new Chess('4k3/4p3/3r4/8/8/8/8/3RK3 w - - 0 1')
    expect(winsMaterial(trade.fen(), trade.move('Rxd6'))).toBeNull()
  })

  it('spots a knight fork', () => {
    const c = new Chess('r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1')
    const m = c.move('Nc7+')
    expect(isFork(m.after, m)?.map((t) => t.type)).toEqual(['k', 'r'])
  })
})

describe('explanations', () => {
  it('missed mate in one', () => {
    const before = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4'
    const c = new Chess(before)
    const m = c.move('a3')
    const fb = explainMove({ move: m, ply: 6, before: A(before, MATE_CP - 1, 'h5f7'), after: A(c.fen(), -30, 'f6h5'), voice })
    expect(fb.grade).toBe('blunder')
    expect(fb.text).toBe('There was checkmate in one: Qxf7#!')
  })

  it('a queen left where a pawn takes it', () => {
    const before = 'rnbqkbnr/pppppp1p/6p1/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'
    const c = new Chess(before)
    const m = c.move('Qh5')
    const fb = explainMove({ move: m, ply: 2, before: A(before, 40, 'd2d4'), after: A(c.fen(), 850, 'g6h5'), voice })
    expect(fb.grade).toBe('blunder')
    expect(fb.text).toContain('queen on h5 can be taken — Pip plays gxh5')
    expect(fb.text).toContain('Better was d4')
  })

  it('teaches the early-queen principle', () => {
    const before = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'
    const c = new Chess(before)
    const m = c.move('Qg4')
    const fb = explainMove({ move: m, ply: 2, before: A(before, 50, 'g1f3'), after: A(c.fen(), 60, 'b8c6'), voice })
    expect(fb.grade).toBe('mistake')
    expect(fb.text).toBe(
      'Bringing the queen out early lets the opponent attack it while developing. Develop knights and bishops first. Better was Nf3.',
    )
  })

  it('praises a fork', () => {
    const before = 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1'
    const c = new Chess(before)
    const m = c.move('Nc7+')
    const fb = explainMove({ move: m, ply: 30, before: A(before, 500, 'b5c7'), after: A(c.fen(), -500, 'e8d7'), voice })
    expect(fb.grade).toBe('best')
    expect(fb.text).toBe('A fork! The knight attacks the king and rook at the same time.')
  })
})

describe('mate threats', () => {
  // After 1.e4 e5 2.Bc4 Nc6 3.Qh5, White threatens Qxf7#
  const fen = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3'

  it('warns about the threat in the first hint and names the defence', () => {
    const a = A(fen, -20, 'g7g6')
    expect(hintFor(a, 1, 5, false)?.text).toBe('Careful: your opponent threatens checkmate with Qxf7#. How do you stop it?')
    expect(hintFor(a, 3, 5, false)?.text).toBe('Play g6. It stops the checkmate threat Qxf7#.')
  })

  it('praises the defence', () => {
    const c = new Chess(fen)
    const m = c.move('g6')
    const fb = explainMove({ move: m, ply: 5, before: A(fen, -20, 'g7g6'), after: A(c.fen(), 20, 'h5f3'), voice })
    expect(fb.text).toBe('That stops the checkmate threat Qxf7#.')
  })
})

describe('hints', () => {
  const fen = '4k3/8/8/3r4/8/8/8/3RK3 w - - 0 1'
  const a = A(fen, 500, 'd1d5')
  it('climbs from an idea to the piece to the move', () => {
    expect(hintFor(a, 1, 20, false)?.text).toBe('You can win material. Is anything of theirs unprotected?')
    expect(hintFor(a, 2, 20, false)).toMatchObject({ square: 'd1', text: 'Look at your rook on d1.' })
    expect(hintFor(a, 3, 20, false)).toMatchObject({ arrow: { from: 'd1', to: 'd5' }, text: 'Play Rxd5. It wins a rook.' })
  })
})
