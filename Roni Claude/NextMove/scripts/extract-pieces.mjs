// Extracts the cburnett piece set (CC BY-SA 3.0, Colin M.L. Burnett) from chessground's CSS
// into public/pieces/<color><Piece>.svg, e.g. wK.svg, bN.svg.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const css = readFileSync('node_modules/chessground/assets/chessground.cburnett.css', 'utf8')
const letter = { pawn: 'P', knight: 'N', bishop: 'B', rook: 'R', queen: 'Q', king: 'K' }
const re = /piece\.(\w+)\.(white|black)\s*\{\s*background-image:\s*url\('data:image\/svg\+xml;base64,([^']+)'\)/g
mkdirSync('public/pieces', { recursive: true })
let n = 0
for (const [, role, color, b64] of css.matchAll(re)) {
  const name = `${color[0]}${letter[role]}`
  writeFileSync(`public/pieces/${name}.svg`, Buffer.from(b64, 'base64'))
  n++
}
console.log(`wrote ${n} pieces`)
