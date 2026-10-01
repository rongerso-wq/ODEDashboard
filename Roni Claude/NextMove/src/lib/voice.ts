// Elias's voice. His own recordings (OpenAI "Ash", lib/recordings.ts) play wherever a sentence has
// one; everything else uses the device's speech synthesis. For that he gets the best-sounding English
// male voice on the device; only the natural (neural) desktop voices are deepened, because shifting
// the pitch of a phone voice makes it sound like a robot (user feedback, 2026-09-28).
import { clipKey, sentences } from './voiceText.ts'
import { hasClip, playClip, preload } from './recordings.ts'

let enabled = true
let chosenName: string | null = null
let useRecordings = true
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
/** true: Elias's recorded voice where a recording exists; false: always the device voice. */
export function setRecordedVoice(on: boolean) {
  useRecordings = on
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
const NOVELTY = /^(Albert|Bad ?News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Good ?News|Hysterical|Jester|Junior|Organ|Pipe ?Organ|Princess|Ralph|Superstar|Trinoids|Whisper|Wobble|Zarvox|Fred|Kathy|Agnes|Bruce|Vicki|Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley)\b/i
// Voices that sound like a person rather than a machine.
const HIGH_QUALITY = /natural|neural|premium|enhanced/i

/**
 * Safari on iPhone names a downloaded Enhanced voice exactly like the basic one ("Daniel"); only
 * its voiceURI ("com.apple.voice.enhanced.en-GB.Daniel") tells them apart. So voices are chosen
 * and stored by voiceURI, and labelled from it (user feedback, 2026-09-28).
 */
export const voiceId = (v: SpeechSynthesisVoice) => v.voiceURI || v.name
/**
 * On an iPhone set to another language the names are translated ("דניאל" for Daniel), but Apple's
 * voiceURI keeps the English name as its last part, so name lists are matched against both.
 */
const idName = (v: SpeechSynthesisVoice) => {
  const uri = v.voiceURI ?? ''
  return uri.includes('.') && !uri.includes(' ') ? (uri.split('.').pop() ?? '') : ''
}
const matches = (re: RegExp, v: SpeechSynthesisVoice) => re.test(v.name) || (!!idName(v) && re.test(idName(v)))
const quality = (v: SpeechSynthesisVoice) => `${v.name} ${v.voiceURI ?? ''}`
export function voiceLabel(v: SpeechSynthesisVoice): string {
  if (HIGH_QUALITY.test(v.name)) return v.name
  const q = /premium/i.test(v.voiceURI ?? '') ? 'Premium' : /enhanced/i.test(v.voiceURI ?? '') ? 'Enhanced' : null
  return q ? `${v.name} (${q})` : v.name
}

/** The device's English voices, without Apple's novelty and robotic ones. */
export function englishVoices(): SpeechSynthesisVoice[] {
  const s = synth()
  return s ? s.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en') && !matches(NOVELTY, v)) : []
}

/**
 * An on-device voice first (online voices send the text being read to the browser's maker, and
 * the automatic fallback must not do that unasked: privacy statement, QA 2026-10-01), then a male
 * voice (Elias is a man), then the best-sounding one, then the preferred names.
 */
export function voiceScore(v: SpeechSynthesisVoice): number {
  const pref = PREFERRED.findIndex((re) => matches(re, v))
  return (
    (v.localService === false ? 0 : 3000) +
    (matches(FEMALE, v) ? 0 : 1000) +
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
  for (const v of voices) if (!matches(NOVELTY, v) && (!best || voiceScore(v) > voiceScore(best))) best = v
  return best ?? voices[0] ?? null
}

/** Pitch and pace for a voice: only desktop neural voices can be deepened without sounding robotic. */
export function tuning(voice: SpeechSynthesisVoice | null): { pitch: number; rate: number } {
  return voice && /natural/i.test(voice.name) ? { pitch: 0.85, rate: 0.92 } : { pitch: 1, rate: 0.95 }
}

// ---------- Playback ----------
// One queue for everything Elias says, played in order: a sentence with a recording (public/voice,
// made by `npm run voice`) plays that; any other sentence uses the device voice. So the two never
// talk over each other, and the device voice is the fallback when a recording is missing.

type Item = { text: string; clip: string | null }
let queue: Item[] = []
let busy = false
let gen = 0 // bumped by stop(): a running queue from before it quietly ends
let loopGen = -1 // the generation whose queue loop is running
let active: { stop: () => void } | null = null

function notify() {
  for (const l of listeners) l(busy)
}

export function onSpeaking(fn: (speaking: boolean) => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function stop() {
  gen++
  queue = []
  active?.stop()
  active = null
  synth()?.cancel()
  busy = false
  notify()
}

/** One sentence in the device voice; resolves when it ends (or is stopped). */
function sayDevice(text: string): Promise<void> {
  const s = synth()
  if (!s) return Promise.resolve()
  return new Promise((done) => {
    const u = new SpeechSynthesisUtterance(text)
    const voice = pickVoice()
    if (voice) {
      u.voice = voice
      u.lang = voice.lang
    } else u.lang = 'en-GB'
    Object.assign(u, tuning(voice))
    u.onend = u.onerror = () => done()
    active = { stop: () => done() }
    s.speak(u)
  })
}

async function run() {
  if (loopGen === gen) return // this generation's loop is already playing the queue
  loopGen = gen
  busy = true
  notify()
  const my = gen
  while (queue.length && my === gen) {
    const item = queue.shift()!
    let played = false
    if (item.clip) {
      try {
        played = await playClip(item.clip, () => my !== gen, (a) => (active = a))
      } catch {
        played = false // not downloaded yet and offline, or undecodable: say it in the device voice
      }
    }
    if (!played && my === gen) await sayDevice(item.text)
  }
  if (my === gen) {
    busy = false
    active = null
    loopGen = -1 // a later speak({ queue: true }) starts a new loop
    notify()
  }
}

/**
 * Says `text`, cancelling whatever Elias was saying — or, with `queue`, after it.
 * Each sentence is a separate item, because some browsers cut off a single long utterance.
 */
export function speak(text: string, opts: { force?: boolean; queue?: boolean } = {}) {
  if (!enabled && !opts.force) return
  const parts = sentences(text)
  if (!parts.length) return
  if (!opts.queue) stop()
  // A text is recorded all or nothing: one voice per text, never half Elias, half device.
  const recorded = useRecordings && parts.every(hasClip)
  if (!recorded && !synth()) return
  const items = parts.map((t) => ({ text: t, clip: recorded ? clipKey(t) : null }))
  for (const i of items) if (i.clip) preload(i.clip)
  queue.push(...items)
  void run()
}

/** Voices load asynchronously in Chrome; call back when the list is ready. */
export function whenVoicesReady(fn: () => void) {
  const s = synth()
  if (!s) return () => {}
  if (s.getVoices().length) fn()
  s.addEventListener('voiceschanged', fn)
  return () => s.removeEventListener('voiceschanged', fn)
}

// Leaving the app (home button, another app, locking the phone) ends what Elias was saying.
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => document.hidden && stop())
