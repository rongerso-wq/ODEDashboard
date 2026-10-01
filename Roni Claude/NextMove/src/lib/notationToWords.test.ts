import { describe, expect, it } from 'vitest'
import { notationToWords } from './speakable'

describe('Kids mode: chess notation in words', () => {
  it('turns moves into words, keeping sentence starts capitalised', () => {
    expect(notationToWords('Careful! Pip wants to checkmate you with Qxf7#. Can you stop it?')).toBe(
      'Careful! Pip wants to checkmate you with queen takes f7, checkmate. Can you stop it?',
    )
    expect(notationToWords('Nf3 was a stronger move.')).toBe('Knight f3 was a stronger move.')
    expect(notationToWords('You can take back with fxe4, but check it is safe first!')).toBe(
      'You can take back with f pawn takes e4, but check it is safe first!',
    )
    expect(notationToWords('Play d4. It develops a piece.')).toBe('Play pawn to d4. It develops a piece.')
    expect(notationToWords('Play O-O.')).toBe('Play castles kingside.')
  })

  it('leaves plain text alone', () => {
    expect(notationToWords('Look at every check, capture and threat!')).toBe('Look at every check, capture and threat!')
  })
})
