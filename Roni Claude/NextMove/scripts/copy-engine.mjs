// Copies the Stockfish 19 "lite single-threaded" WASM build (GPLv3, stockfish.js by Nathan Rugg)
// into public/engine/. The .js finds its .wasm by swapping the extension, so the names must match.
import { copyFileSync, mkdirSync } from 'node:fs'

const src = 'node_modules/stockfish'
mkdirSync('public/engine', { recursive: true })
copyFileSync(`${src}/bin/stockfish-19-lite-single.js`, 'public/engine/stockfish.js')
copyFileSync(`${src}/bin/stockfish-19-lite-single.wasm`, 'public/engine/stockfish.wasm')
copyFileSync(`${src}/Copying.txt`, 'public/engine/COPYING.txt')
console.log('engine copied to public/engine/')
