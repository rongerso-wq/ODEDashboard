import { useEffect, useState } from 'react'
import { onSpeaking, speak, stop } from './voice'
import { useSettings } from './settings'

/** Is Elias talking right now? */
export function useSpeaking() {
  const [speaking, setSpeaking] = useState(false)
  useEffect(() => onSpeaking(setSpeaking), [])
  return speaking
}

/**
 * Elias reads `text` aloud whenever it changes (if his voice is on), and stops when the
 * component goes. `key` lets the same text be spoken again (e.g. the same prompt on a new puzzle).
 */
export function useSay(text: string | null | undefined, key?: string | number, opts: { queue?: boolean } = {}) {
  const { voice } = useSettings()
  const queue = !!opts.queue
  useEffect(() => {
    if (voice && text) speak(text, { queue })
  }, [text, key, voice, queue])
  useEffect(() => () => stop(), [])
}
