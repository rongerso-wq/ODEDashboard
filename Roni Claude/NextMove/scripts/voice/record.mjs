// Records Elias's lines with OpenAI text-to-speech (voice "ash") into public/voice/<key>.mp3
// and writes src/voice/manifest.json (the keys that have a recording).
// Only new or changed sentences are recorded, so a re-run costs only what changed.
//   npm run voice              collect + record
//   node scripts/voice/record.mjs --prune   also delete recordings no longer used
// Needs OPENAI_API_KEY in .env.local (never committed, never uploaded).
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { Mp3Encoder } from '@breezystack/lamejs'

const root = new URL('../../', import.meta.url)
const OUT = new URL('public/voice/', root)
const MANIFEST = new URL('src/voice/manifest.json', root)

const MODEL = 'gpt-4o-mini-tts'
const VOICE = 'ash' // chosen by the user from six samples (2026-09-28)
const INSTRUCTIONS =
  'Warm, calm, wise elderly chess teacher. Speaks slowly and kindly, with gentle encouragement, like a grandfather teaching a child. Keep the same voice, pace and warmth in every line.'
const RATE = 24000 // OpenAI "pcm" is 24 kHz, 16-bit, mono
const KBPS = 40

function apiKey() {
  const env = existsSync(new URL('.env.local', root)) ? readFileSync(new URL('.env.local', root), 'utf8') : ''
  const key = env.match(/^OPENAI_API_KEY=(.+)$/m)?.[1]?.trim()
  if (!key || key.includes('paste-your-key')) throw new Error('Put OPENAI_API_KEY=… in .env.local first')
  return key
}

/** Cuts the silence before and after the speech, keeping a short natural pause. */
function trim(pcm) {
  const loud = (i) => Math.abs(pcm[i]) > 500
  let a = 0
  let b = pcm.length - 1
  while (a < b && !loud(a)) a++
  while (b > a && !loud(b)) b--
  const pad = Math.round(RATE * 0.06)
  return pcm.subarray(Math.max(0, a - pad), Math.min(pcm.length, b + pad * 2))
}

function mp3(pcm) {
  const enc = new Mp3Encoder(1, RATE, KBPS)
  const parts = []
  for (let i = 0; i < pcm.length; i += 1152) {
    const buf = enc.encodeBuffer(pcm.subarray(i, i + 1152))
    if (buf.length) parts.push(Buffer.from(buf))
  }
  const end = enc.flush()
  if (end.length) parts.push(Buffer.from(end))
  return Buffer.concat(parts)
}

async function speak(text, key) {
  for (let attempt = 1; ; attempt++) {
    const r = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, voice: VOICE, input: text, instructions: INSTRUCTIONS, response_format: 'pcm' }),
    })
    if (r.ok) {
      const bytes = Buffer.from(await r.arrayBuffer())
      return new Int16Array(bytes.buffer, bytes.byteOffset, bytes.length >> 1)
    }
    if (attempt >= 4 || (r.status !== 429 && r.status < 500)) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`)
    await new Promise((res) => setTimeout(res, 2000 * attempt))
  }
}

const lines = JSON.parse(readFileSync(new URL('scripts/voice/lines.json', root), 'utf8'))
mkdirSync(OUT, { recursive: true })
mkdirSync(new URL('src/voice/', root), { recursive: true })

const limit = Number(process.argv.find((a) => a.startsWith('--limit='))?.slice(8)) || Infinity
const todo = lines.filter((l) => !existsSync(new URL(`${l.key}.mp3`, OUT))).slice(0, limit)
const chars = todo.reduce((n, l) => n + l.text.length, 0)
console.log(`${lines.length} sentences, ${lines.length - todo.length} already recorded, ${todo.length} to record (${chars} characters)`)

const key = todo.length ? apiKey() : ''
let done = 0
let failed = 0
const queue = [...todo]
await Promise.all(
  Array.from({ length: 4 }, async () => {
    for (let l = queue.shift(); l; l = queue.shift()) {
      try {
        writeFileSync(new URL(`${l.key}.mp3`, OUT), mp3(trim(await speak(l.text, key))))
        if (++done % 25 === 0) console.log(`  ${done}/${todo.length}`)
      } catch (e) {
        failed++
        console.log(`  FAILED "${l.text}": ${e.message}`)
      }
    }
  }),
)

const wanted = new Set(lines.map((l) => l.key))
const files = readdirSync(OUT).filter((f) => f.endsWith('.mp3'))
const orphans = files.filter((f) => !wanted.has(f.slice(0, -4)))
if (process.argv.includes('--prune')) for (const f of orphans) rmSync(new URL(f, OUT))
else if (orphans.length) console.log(`${orphans.length} recordings are no longer used (--prune deletes them)`)

const have = lines.filter((l) => existsSync(new URL(`${l.key}.mp3`, OUT))).map((l) => l.key).sort()
writeFileSync(MANIFEST, JSON.stringify(have) + '\n')
const bytes = have.reduce((n, k) => n + readFileSync(new URL(`${k}.mp3`, OUT)).length, 0)
console.log(`recorded ${done}, failed ${failed}; manifest: ${have.length} clips, ${(bytes / 1e6).toFixed(1)} MB`)
