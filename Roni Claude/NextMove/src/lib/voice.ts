// Elias's voice: the browser's built-in speech synthesis. He gets the best-sounding English male
// voice on the device; only the natural (neural) desktop voices are deepened, because shifting the
// pitch of a phone voice makes it sound like a robot (user feedback, 2026-09-28).
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

// Best "wise old man" candidates first (Edge natural voices, then Apple, Google, Windows).
const PREFERRED = [
  /Thomas.*Natural/i, // Microsoft Thomas (UK), Edge
  /Ryan.*Natural/i,
  /Christopher.*Natural/i,
  /Guy.*Natural/i,
  /Davis.*Natural/i,
  /^Daniel\b/i, // Apple en-GB
  /^Arthur\b/i,
  /^Oliver\b/i,
  /Google UK English Male/i,
  /Microsoft George/i,
  /^(Evan|Nathan|Tom|Aaron)\b/i, // Apple en-US
  /Microsoft David/i,
  /Microsoft Mark/i,
  /^Alex$/i,
]
const FEMALE = /female|zira|hazel|susan|samantha|victoria|karen|moira|tessa|fiona|aria|jenny|sonia|libby|emma|ava|allison|serena|kate|martha|nicky|zoe|google us english$|google uk english female/i
// Apple's joke voices and its old robotic synthesizers (MacInTalk, Eloquence). "Fred" once headed the list.
const NOVELTY = /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Good News|Hysterical|Jester|Junior|Organ|Pipe Organ|Princess|Ralph|Superstar|Trinoids|Whisper|Wobble|Zarvox|Fred|Kathy|Agnes|Bruce|Vicki|Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley)\b/i
// Voices that sound like a person rather than a machine.
const HIGH_QUALITY = /natural|neural|premium|enhanced/i

/**
 * Safari on iPhone names a downloaded Enhanced voice exactly like the basic one ("Daniel"); only
 * its voiceURI ("com.apple.voice.enhanced.en-GB.Daniel") tells them apart. So voices are chosen
 * and stored by voiceURI, and labelled from it (user feedback, 2026-09-28).
 */
export const voiceId = (v: SpeechSynthesisVoice) => v.voiceURI || v.name
const quality = (v: SpeechSynthesisVoice) => `${v.name} ${v.voiceURI ?? ''}`
export function voiceLabel(v: SpeechSynthesisVoice): string {
  if (HIGH_QUALITY.test(v.name)) return v.name
  const q = /premium/i.test(v.voiceURI ?? '') ? 'Premium' : /enhanced/i.test(v.voiceURI ?? '') ? 'Enhanced' : null
  return q ? `${v.name} (${q})` : v.name
}

/** The device's English voices, without Apple's novelty and robotic ones. */
export function englishVoices(): SpeechSynthesisVoice[] {
  const s = synth()
  return s ? s.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en') && !NOVELTY.test(v.name)) : []
}

/** A male voice first (Elias is a man), then the best-sounding one, then the preferred names. */
export function voiceScore(v: SpeechSynthesisVoice): number {
  const pref = PREFERRED.findIndex((re) => re.test(v.name))
  return (
    (FEMALE.test(v.name) ? 0 : 1000) +
    (HIGH_QUALITY.test(quality(v)) ? 200 : /google/i.test(v.name) ? 100 : 0) +
    (pref < 0 ? 0 : 50 - pref) +
    (v.lang.toLowerCase() === 'en-gb' ? 5 : 0)
  )
}

export function pickVoice(voices = englishVoices()): SpeechSynthesisVoice | null {
  if (chosenName) {
    // stored as a voiceURI; older versions stored the name
    const v = voices.find((x) => voiceId(x) === chosenName) ?? voices.find((x) => x.name === chosenName)
    if (v) return v
  }
  return bestVoice(voices)
}

/** The voice "Automatic" means, whatever the player has chosen. */
export function bestVoice(voices = englishVoices()): SpeechSynthesisVoice | null {
  let best: SpeechSynthesisVoice | null = null
  for (const v of voices) if (!NOVELTY.test(v.name) && (!best || voiceScore(v) > voiceScore(best))) best = v
  return best ?? voices[0] ?? null
}

/** Pitch and pace for a voice: only desktop neural voices can be deepened without sounding robotic. */
export function tuning(voice: SpeechSynthesisVoice | null): { pitch: number; rate: number } {
  return voice && /natural/i.test(voice.name) ? { pitch: 0.85, rate: 0.92 } : { pitch: 1, rate: 0.95 }
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
    Object.assign(u, tuning(voice))
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
