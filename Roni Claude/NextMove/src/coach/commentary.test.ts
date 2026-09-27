import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import { commentOnMove } from './commentary'

const say = (fen: string, san: string, ply = 20, kids = false) => {
  const c = new Chess(fen)
  return commentOnMove(c.move(san), ply, { bot: 'Pip', kids })
}

describe("commentary on the opponent's move", () => {
  it('warns about a mate threat (Scholar’s mate)', () => {
    // 1.e4 e5 2.Bc4 Nc6 — now White plays 3.Qh5; the player is Black
    const c = say('r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 3', 'Qh5', 4)
    expect(c).toEqual({ tone: 'danger', text: 'Careful: Pip threatens checkmate with Qxf7#. Deal with that first.' })
  })

  it('explains a check', () => {
    const c = say('4k3/8/8/8/8/8/8/R3K3 w - - 0 1', 'Ra8+')
    expect(c?.tone).toBe('danger')
    expect(c?.text).toBe('Check from the rook on a8. Move the king, block the check, or capture the checking piece.')
  })

  it('names a fork', () => {
    // Black knight forks White's king and rook: the player is White
    const c = say('4k3/8/8/8/8/8/1n3R2/4K3 b - - 0 1', 'Nd3+')
    expect(c?.text).toBe("Check, and a fork! Pip's knight attacks your king and rook. Save the king first.")
  })

  it('points out a piece that is now attacked', () => {
    // White pawn attacks the black knight on d5 after e2-e4
    const c = say('4k3/8/8/3n4/8/8/4P3/4K3 w - - 0 1', 'e4')
    expect(c?.text).toBe("Pip's pawn now attacks your knight on d5. Move it or protect it.")
  })

  it('explains a capture of an unprotected piece', () => {
    const c = say('4k3/8/8/3n4/8/8/8/3RK3 w - - 0 1', 'Rxd5')
    expect(c?.text).toBe('Pip won your knight on d5: it was unprotected. Before each move, check which of your pieces are defended.')
  })

  it('offers the recapture when the capturer is loose', () => {
    // Pip's rook takes on d5, and Black's queen on d8 can take it back for free
    const c = say('3qk3/8/8/3n4/8/8/8/3RK3 w - - 0 1', 'Rxd5')
    expect(c?.tone).toBe('chance')
    expect(c?.text).toBe('Pip took your knight on d5, but you can win it back with Qxd5.')
  })

  it('stays quiet on ordinary moves, talks about the centre early on', () => {
    expect(say('4k3/8/8/8/8/8/P7/4K3 w - - 0 1', 'a3', 30)).toBeNull()
    expect(say('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'e4', 0)?.text).toBe('Pip fights for the centre with e4.')
  })

  it('has simpler words in Kids mode', () => {
    const c = say('r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 3', 'Qh5', 4, true)
    expect(c?.text).toBe('Careful! Pip wants to checkmate you with Qxf7#. Can you stop it?')
  })
})
