// Writes public/licenses.txt: the notices for everything NextMove ships (QA L).
// MIT, BSD and OFL require their notices to travel with the app, and the minified bundle drops
// them. Re-run (`npm run licenses`) after adding a dependency or updating one.
import { readFileSync, writeFileSync } from 'node:fs'

const pkg = (name) => JSON.parse(readFileSync(`node_modules/${name}/package.json`, 'utf8'))
const text = (path) => readFileSync(path, 'utf8').trim()
const rule = '='.repeat(72)

// Everything that ends up in the built app (scheduler comes with react-dom, workbox-core with
// workbox-window, which the service-worker registration uses).
const BUNDLED = [
  'react',
  'react-dom',
  'scheduler',
  'chess.js',
  'workbox-window',
  'workbox-core',
  '@fontsource-variable/inter',
  '@fontsource-variable/fraunces',
]

const sf = pkg('stockfish')
const out = [
  'NextMove: licences and credits',
  '',
  'NextMove is free, has no ads and collects no personal data. It is built on the',
  'work of others, credited below.',
  '',
  rule,
  `Stockfish ${sf.version} (chess engine), via stockfish.js`,
  'Licence: GNU General Public License v3. Full text: engine/COPYING.txt',
  'NextMove runs the unmodified engine. Source code:',
  '  https://github.com/official-stockfish/Stockfish',
  '  https://github.com/nmrugg/stockfish.js',
  '',
  rule,
  'Chess pieces: "cburnett" set by Colin M.L. Burnett',
  'Licence: Creative Commons Attribution-ShareAlike 3.0',
  '  https://creativecommons.org/licenses/by-sa/3.0/',
  'Taken unchanged from the chessground project (lichess.org).',
  '',
  rule,
  'Puzzles: the Lichess puzzle database, https://database.lichess.org/#puzzles',
  'Released into the public domain (Creative Commons CC0).',
]

for (const name of BUNDLED) {
  const p = pkg(name)
  out.push('', rule, `${name} ${p.version}`, `Licence: ${p.license}`, '', text(`node_modules/${name}/LICENSE`))
}

writeFileSync('public/licenses.txt', out.join('\n') + '\n')
console.log(`public/licenses.txt: ${BUNDLED.length + 3} entries`)
