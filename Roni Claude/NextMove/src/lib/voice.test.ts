import { describe, expect, it } from 'vitest'
import { pickVoice, tuning } from './voice'

const v = (name: string, lang = 'en-US') => ({ name, lang }) as SpeechSynthesisVoice

// Elias sounded like a robot on phones (user feedback, 2026-09-28): the pitch was pushed down on
// every non-neural voice, and on Apple devices a novelty voice such as "Fred" could win.
describe('Elias picks a voice that sounds like a person', () => {
  it('iPhone: prefers an Enhanced male voice and never a novelty one', () => {
    const ios = [v('Albert'), v('Fred'), v('Zarvox'), v('Grandpa'), v('Samantha'), v('Daniel', 'en-GB'), v('Daniel (Enhanced)', 'en-GB')]
    expect(pickVoice(ios)?.name).toBe('Daniel (Enhanced)')
  })

  it('iPhone with only novelty and female voices besides Daniel still picks Daniel', () => {
    expect(pickVoice([v('Bad News'), v('Trinoids'), v('Karen', 'en-AU'), v('Daniel', 'en-GB')])?.name).toBe('Daniel')
  })

  it('Android: the Google UK male voice over plain system voices', () => {
    const android = [v('English United States'), v('Google US English'), v('Google UK English Male', 'en-GB')]
    expect(pickVoice(android)?.name).toBe('Google UK English Male')
  })

  it('Edge on Windows: a natural (neural) male voice', () => {
    const edge = [v('Microsoft David - English (United States)'), v('Microsoft Sonia Online (Natural) - English (United Kingdom)', 'en-GB'), v('Microsoft Thomas Online (Natural) - English (United Kingdom)', 'en-GB')]
    expect(pickVoice(edge)?.name).toContain('Thomas')
  })

  it('only neural voices are deepened; phone voices keep their natural pitch', () => {
    expect(tuning(v('Daniel (Enhanced)', 'en-GB')).pitch).toBe(1)
    expect(tuning(v('Google UK English Male', 'en-GB')).pitch).toBe(1)
    expect(tuning(v('Microsoft Thomas Online (Natural) - English (United Kingdom)')).pitch).toBeLessThan(1)
    expect(tuning(null).pitch).toBe(1)
  })
})
