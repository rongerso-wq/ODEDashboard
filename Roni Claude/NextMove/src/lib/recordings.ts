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
    // iPhones mute Web Audio with the silent switch (the device voice isn't); "playback" keeps
    // Elias audible, like any audio app (Safari 17+; elsewhere the property doesn't exist)
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession
    if (session) session.type = 'playback'
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

// ---------- Offline download ----------
// Played clips are kept by the service worker (runtime cache "elias-voice"). All of them together
// are ~24 MB, too much to fetch silently on mobile data, so Settings offers a one-tap download.

const CACHE = 'elias-voice'
const clipUrl = (key: string) => new URL(`${import.meta.env.BASE_URL}voice/${manifest.voice}/${key}.mp3`, location.href).href

/** How many of Elias's clips are already stored on this device (0 when storage is unavailable). */
export async function offlineCount(): Promise<number> {
  try {
    if (!('caches' in window) || !(await caches.has(CACHE))) return 0
    const stored = new Set((await (await caches.open(CACHE)).keys()).map((r) => r.url))
    return manifest.clips.filter((k) => stored.has(clipUrl(k))).length
  } catch {
    return 0
  }
}

export const clipTotal = manifest.clips.length

/**
 * Stores every clip for offline use, a few at a time. Each fetch goes through the service worker,
 * which keeps it; without one (dev), clips are put in the cache here. Resolves with the number stored.
 */
export async function downloadAll(onProgress: (done: number) => void): Promise<number> {
  const cache = await caches.open(CACHE)
  const stored = new Set((await cache.keys()).map((r) => r.url))
  const todo = manifest.clips.filter((k) => !stored.has(clipUrl(k)))
  let done = clipTotal - todo.length
  onProgress(done)
  const worker = async () => {
    for (let k = todo.shift(); k; k = todo.shift()) {
      try {
        const r = await fetch(clipUrl(k))
        if (r.ok && !navigator.serviceWorker?.controller) await cache.put(clipUrl(k), r)
        if (r.ok) onProgress(++done)
      } catch {
        /* offline half-way: the next tap continues where this stopped */
      }
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker))
  return done
}
export const voiceMb = manifest.mb
