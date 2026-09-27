// Elias's voice: the browser's built-in speech synthesis, tuned to sound like an old, calm teacher
// (the deepest available English male voice, lower pitch, slower pace).
// Swappable: everything speaks through `speak()`, so a premium voice service could replace it here.
import { speakable } from './speakable'

let enabled = true
let chosenName: string | null = null
let current: SpeechSynthesisUtterance[] = []
const listeners = new Set<(speaking: boolean) => void>()

const synth = () => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null)
export const voiceSupported = () => !!synth()

export function setVoiceEnabled(on: boolean) {
  enabled = on
  if (!on) stop()
}
export function setVoiceName(name: string | null) {
  chosenName = name
}

// Best "wise old man" candidates first (Edge natural voices, macOS, Google, Windows).
const PREFERRED = [
  /Thomas.*Natural/i, // Microsoft Thomas (UK), Edge
  /Ryan.*Natural/i,
  /Christopher.*Natural/i,
  /Guy.*Natural/i,
  /Davis.*Natural/i,
  /^Daniel/i, // macOS / iOS en-GB
  /^Arthur/i,
  /Google UK English Male/i,
  /Microsoft George/i,
  /^Fred$/i,
  /Microsoft David/i,
  /Microsoft Mark/i,
  /^Alex$/i,
]
const FEMALE = /female|zira|hazel|susan|samantha|victoria|karen|moira|tessa|fiona|aria|jenny|sonia|libby|emma|ava|allison|google us english$|google uk english female/i

export function englishVoices(): SpeechSynthesisVoice[] {
  const s = synth()
  return s ? s.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en')) : []
}

export function pickVoice(voices = englishVoices()): SpeechSynthesisVoice | null {
  if (chosenName) {
    const v = voices.find((x) => x.name === chosenName)
    if (v) return v
  }
  for (const re of PREFERRED) {
    const v = voices.find((x) => re.test(x.name))
    if (v) return v
  }
  return voices.find((v) => !FEMALE.test(v.name)) ?? voices[0] ?? null
}

function notify() {
  const speaking = current.length > 0
  for (const l of listeners) l(speaking)
}

export function onSpeaking(fn: (speaking: boolean) => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function stop() {
  const s = synth()
  current = []
  s?.cancel()
  notify()
}

/**
 * Says `text`, cancelling whatever Elias was saying — or, with `queue`, after it.
 * Long texts are split into sentences, because some browsers cut off a single long utterance.
 */
export function speak(text: string, opts: { force?: boolean; queue?: boolean } = {}) {
  const s = synth()
  if (!s || (!enabled && !opts.force)) return
  const clean = speakable(text)
  if (!clean) return
  if (!opts.queue) {
    s.cancel()
    current = []
  }
  const voice = pickVoice()
  const parts = clean.match(/[^.!?]+[.!?]*\s*/g) ?? [clean]
  const added = parts.map((part) => {
    const u = new SpeechSynthesisUtterance(part.trim())
    if (voice) {
      u.voice = voice
      u.lang = voice.lang
    } else u.lang = 'en-GB'
    // natural (neural) voices already sound mature; only deepen the plain ones
    const natural = voice && /natural|online/i.test(voice.name)
    u.pitch = natural ? 0.85 : 0.7
    u.rate = natural ? 0.92 : 0.86
    u.onend = u.onerror = () => {
      current = current.filter((x) => x !== u)
      notify()
    }
    return u
  })
  current = [...current, ...added]
  for (const u of added) s.speak(u)
  notify()
}

/** Voices load asynchronously in Chrome; call back when the list is ready. */
export function whenVoicesReady(fn: () => void) {
  const s = synth()
  if (!s) return () => {}
  if (s.getVoices().length) fn()
  s.addEventListener('voiceschanged', fn)
  return () => s.removeEventListener('voiceschanged', fn)
}
