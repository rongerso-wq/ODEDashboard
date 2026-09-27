// Builds src/puzzles/puzzles.json from the Lichess puzzle database (CC0 — public domain):
// https://database.lichess.org/#puzzles
// Only the first ~12 MB of the compressed file is streamed (well over 100k puzzles); from those we
// keep popular, well-established puzzles, balanced across themes and rating bands.
// Run: npm run puzzles   (then: npx vitest run src/puzzles)
import { writeFileSync, mkdirSync } from 'node:fs'
import { zstdDecompressSync } from 'node:zlib'

const URL = 'https://database.lichess.org/lichess_db_puzzle.csv.zst'
const BYTES = 12_000_000

// Theme sets shown in the app (Lichess theme tags).
export const THEMES = [
  'mateIn1', 'mateIn2', 'mateIn3', 'fork', 'pin', 'skewer', 'discoveredAttack',
  'hangingPiece', 'backRankMate', 'promotion', 'endgame', 'opening', 'sacrifice', 'defensiveMove',
]
const PER_THEME_BAND = 12 // per theme, per rating band
const BANDS = [[0, 800], [800, 1200], [1200, 1600], [1600, 2000], [2000, 3500]]
const POOL_PER_100 = 36 // general pool per 100 rating points, 400–2800

// The file is "pzstd" format: every zstd frame is preceded by a skippable frame
// (magic 0x184D2A50, 4-byte payload = the size of the next compressed frame).
// Download the start, read that size, and decompress just the first frame.
const res = await fetch(URL, { headers: { Range: `bytes=0-${BYTES - 1}` } })
if (!res.ok && res.status !== 206) throw new Error(`download failed: ${res.status}`)
const buf = Buffer.from(await res.arrayBuffer())
if (buf.readUInt32LE(0) !== 0x184d2a50) throw new Error('unexpected file layout (no pzstd skippable frame)')
const frameSize = buf.readUInt32LE(8)
if (12 + frameSize > buf.length) throw new Error(`first frame (${frameSize} bytes) is larger than the download; raise BYTES`)
const csv = zstdDecompressSync(buf.subarray(12, 12 + frameSize)).toString('utf8')

const rows = []
const lines = csv.split('\n')
for (const line of lines.slice(1)) {
  const [id, fen, moves, rating, rd, popularity, plays, themes] = line.split(',')
  if (!themes) continue // last line of the frame may be cut
  const r = { id, fen, moves, rating: +rating, rd: +rd, popularity: +popularity, plays: +plays, themes }
  // Easy puzzles are rarer in the database; beginners need plenty, so the bar is a little lower there.
  const easy = r.rating < 1100
  const good = easy ? r.popularity >= 80 && r.plays >= 300 && r.rd <= 90 : r.popularity >= 90 && r.plays >= 1000 && r.rd <= 80
  if (good && moves.split(' ').length <= 8) rows.push(r)
}
console.log(`scanned ${lines.length - 1} puzzles; ${rows.length} pass the quality filter`)

const chosen = new Map()
const take = (r) => chosen.set(r.id, r)

// General pool: even spread over ratings (used by rated mode, rush and the daily puzzle).
for (let lo = 400; lo < 2800; lo += 100) {
  rows
    .filter((r) => r.rating >= lo && r.rating < lo + 100)
    .sort((a, b) => b.popularity - a.popularity || b.plays - a.plays)
    .slice(0, lo < 1200 ? POOL_PER_100 * 2.5 : POOL_PER_100)
    .forEach(take)
}
// Theme sets: the most popular puzzles per theme and rating band.
for (const t of THEMES)
  for (const [lo, hi] of BANDS)
    rows
      .filter((r) => r.rating >= lo && r.rating < hi && r.themes.split(' ').includes(t))
      .sort((a, b) => b.plays - a.plays)
      .slice(0, PER_THEME_BAND)
      .forEach(take)

const puzzles = [...chosen.values()]
  .sort((a, b) => a.rating - b.rating)
  .map((r) => [r.id, r.fen, r.moves, r.rating, r.themes])

mkdirSync('src/puzzles', { recursive: true })
writeFileSync(
  'src/puzzles/puzzles.json',
  JSON.stringify({ source: 'Lichess puzzle database (CC0), https://database.lichess.org', puzzles }),
)
const counts = Object.fromEntries(THEMES.map((t) => [t, puzzles.filter((p) => p[4].split(' ').includes(t)).length]))
console.log(`wrote ${puzzles.length} puzzles`, counts)
