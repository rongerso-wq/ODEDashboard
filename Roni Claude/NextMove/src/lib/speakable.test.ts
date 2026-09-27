import { describe, expect, it } from 'vitest'
import { sanToWords, speakable, spokenMove } from './speakable'

describe('chess notation to speech', () => {
  it('reads moves as words', () => {
    expect(sanToWords('Nf3')).toBe('Knight f3')
    expect(sanToWords('Qxf7#')).toBe('Queen takes f7, checkmate')
    expect(sanToWords('exd5')).toBe('e pawn takes d5')
    expect(sanToWords('O-O')).toBe('castles kingside')
    expect(sanToWords('O-O-O+')).toBe('castles queenside, check')
    expect(sanToWords('e8=Q')).toBe('e8 promotes to a queen')
    expect(sanToWords('Nbd2')).toBe('Knight b to d2')
    expect(sanToWords('R1xe4')).toBe('Rook 1 takes e4')
    expect(sanToWords('Rxd5+')).toBe('Rook takes d5, check')
  })

  it('cleans full sentences', () => {
    expect(speakable('There was checkmate in one: Qxf7#!')).toBe('There was checkmate in one: Queen takes f7, checkmate!')
    expect(speakable('Better was d4.')).toBe('Better was pawn to d4.')
    expect(speakable('Play Nf3. It develops a piece.')).toBe('Play Knight f3. It develops a piece.')
    expect(speakable('Super move! ⭐')).toBe('Super move!')
    expect(speakable('The position goes from +0.5 to −0.6.')).toBe('The position goes from plus 0 point 5 to minus 0 point 6.')
    expect(speakable('3… Nf6')).toBe('Knight f6')
    expect(speakable('Next move: c5')).toBe('Next move: pawn to c5')
    expect(speakable('Attack it together — Scholar’s mate.')).toBe('Attack it together, Scholar’s mate.')
  })

  it('announces single moves the same way everywhere', () => {
    expect(spokenMove('e4')).toBe('Pawn to e4')
    expect(spokenMove('g6+')).toBe('Pawn to g6, check')
    expect(spokenMove('Nf6')).toBe('Knight f6')
    expect(spokenMove('exd5')).toBe('e pawn takes d5')
  })

  it('reads emphasised capitals as words', () => {
    expect(speakable('CHECKMATE is check with no way out.')).toBe('checkmate is check with no way out.')
    expect(speakable('A FORK attacks two pieces.')).toBe('A fork attacks two pieces.')
  })

  it('leaves normal words alone', () => {
    expect(speakable('A knight on the rim is dim.')).toBe('A knight on the rim is dim.')
    expect(speakable('Look at your rook on d1.')).toBe('Look at your rook on d1.')
  })
})
