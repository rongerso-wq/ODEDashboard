// Elias's recorded voice: MP3s in public/voice/<voice>/<key>.mp3, made by `npm run voice` (OpenAI
// "Onyx", deep and subtle).
// Played through the Web Audio API: one AudioContext, unlocked by the first tap (iPhones allow sound
// only after a tap), buffers decoded once and kept.
import manifest from '../voice/manifest.json'
import { clipKey } from './voiceText.ts'

const CLIPS = new Set<string>(manifest.clips)

/** Has this sentence (exactly as `sentences()` gives it) been recorded? */
export const hasClip = (sentence: string) => CLIPS.has(clipKey(sentence))

let ctx: AudioContext | null = null
function audio(): AudioContext | null {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  return ctx
}

// iPhones keep audio suspended until a tap has played something.
if (typeof window !== 'undefined') {
  const unlock = () => {
    const c = audio()
    if (!c) return
    void c.resume()
    const src = c.createBufferSource()
    src.buffer = c.createBuffer(1, 1, 22050)
    src.connect(c.destination)
    src.start(0)
    if (c.state === 'running') {
      removeEventListener('pointerdown', unlock, true)
      removeEventListener('keydown', unlock, true)
    }
  }
  addEventListener('pointerdown', unlock, true)
  addEventListener('keydown', unlock, true)
}

const buffers = new Map<string, Promise<AudioBuffer>>()

/** Starts downloading and decoding a clip (the service worker keeps it for offline use). */
export function preload(key: string): Promise<AudioBuffer> {
  let p = buffers.get(key)
  if (!p) {
    const c = audio()
    p = c
      ? fetch(`${import.meta.env.BASE_URL}voice/${manifest.voice}/${key}.mp3`)
          .then((r) => {
            if (!r.ok) throw new Error(`voice clip ${key}: ${r.status}`)
            return r.arrayBuffer()
          })
          .then((b) => c.decodeAudioData(b))
      : Promise.reject(new Error('no Web Audio'))
    p.catch(() => buffers.delete(key)) // try again next time (e.g. back online)
    buffers.set(key, p)
  }
  return p
}

/** A short breath between sentences. */
const GAP = 0.14

/**
 * Plays one clip. Resolves true when it has played (or was stopped), false if it could not start.
 * `cancelled` is checked after the download, so a stop() during it plays nothing.
 */
export async function playClip(
  key: string,
  cancelled: () => boolean,
  setActive: (a: { stop: () => void }) => void,
): Promise<boolean> {
  const c = audio()
  if (!c) return false
  const buf = await preload(key)
  if (cancelled()) return true
  if (c.state === 'suspended') await c.resume().catch(() => {})
  if (c.state !== 'running') return false // no tap yet: the device voice has its own rules
  return new Promise((done) => {
    const src = c.createBufferSource()
    src.buffer = buf
    src.connect(c.destination)
    let finished = false
    const end = () => {
      if (finished) return
      finished = true
      setTimeout(() => done(true), GAP * 1000)
    }
    src.onended = end
    setActive({
      stop: () => {
        try {
          src.stop()
        } catch {
          /* already stopped */
        }
        finished = true
        done(true)
      },
    })
    src.start()
  })
}
