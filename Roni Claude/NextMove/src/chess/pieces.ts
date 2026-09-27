import type { Color, PieceSymbol } from 'chess.js'

/** cburnett piece set (CC BY-SA 3.0), extracted to public/pieces by scripts/extract-pieces.mjs */
export const pieceUrl = (p: { type: PieceSymbol; color: Color }) => `/pieces/${p.color}${p.type.toUpperCase()}.svg`
