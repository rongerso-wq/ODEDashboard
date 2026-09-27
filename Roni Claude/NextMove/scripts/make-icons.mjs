// App icons: the cburnett knight on the brass tile (same as the in-app logo).
//   icon-192/512.png  rounded tile, for browsers and desktop installs
//   maskable-512.png  full-bleed, knight inside the 80% safe zone (Android crops to its own shape)
//   apple-touch-icon  full-bleed 180px (iOS rounds the corners itself)
// Run: node scripts/make-icons.mjs
import { readFileSync, mkdirSync } from 'node:fs'
import sharp from 'sharp'

const knightSvg = readFileSync('public/pieces/wN.svg', 'utf8')
const knight = knightSvg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')

function icon(size, { rounded }) {
  const scale = 7.2 // 45-unit piece -> 324 px on a 512 canvas
  const offset = (512 - 45 * scale) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="brass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ecd29a"/>
      <stop offset="0.55" stop-color="#d4ad62"/>
      <stop offset="1" stop-color="#a97a36"/>
    </linearGradient>
    <!-- applied inside the scaled 45-unit piece space, so offsets/blur are in piece units -->
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="0.9" stdDeviation="0.9" flood-color="#3a2410" flood-opacity="0.45"/>
    </filter>
  </defs>
  <rect width="512" height="512" ${rounded ? 'rx="112"' : ''} fill="url(#brass)"/>
  <g filter="url(#shadow)" transform="translate(${offset} ${offset - 6}) scale(${scale})">${knight}</g>
</svg>`
}

mkdirSync('public/icons', { recursive: true })
const jobs = [
  ['public/icons/icon-192.png', 192, true],
  ['public/icons/icon-512.png', 512, true],
  ['public/icons/maskable-512.png', 512, false],
  ['public/icons/apple-touch-icon.png', 180, false],
]
for (const [file, size, rounded] of jobs) {
  await sharp(Buffer.from(icon(size, { rounded }))).png().toFile(file)
  console.log('wrote', file)
}
