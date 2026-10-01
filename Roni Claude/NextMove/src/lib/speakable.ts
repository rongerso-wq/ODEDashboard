// Turns on-screen text into something a speech voice reads naturally:
// chess notation becomes words ("Qxf7#" -> "Queen takes f7, checkmate"), symbols and emoji go.

const PIECE: Record<string, string> = { K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight' }

/** One SAN move in words. */
export function sanToWords(san: string): string {
  const suffix = san.includes('#') ? ', checkmate' : san.includes('+') ? ', check' : ''
  const s = san.replace(/[+#!?]/g, '')
  if (s === 'O-O') return `castles kingside${suffix}`
  if (s === 'O-O-O') return `castles queenside${suffix}`
  const m = s.match(/^([KQRBN])?([a-h])?([1-8])?(x)?([a-h][1-8])(?:=([QRBN]))?$/)
  if (!m) return san
  const [, piece, fromFile, fromRank, takes, to, promo] = m
  const words: string[] = []
  if (piece) words.push(PIECE[piece])
  else if (takes && fromFile) words.push(`${fromFile} pawn`)
  const from = piece && (fromFile || fromRank) ? `${fromFile ?? ''}${fromRank ?? ''}` : ''
  if (from) words.push(from) // "Knight b to d2"
  words.push(takes ? `takes ${to}` : from ? `to ${to}` : to)
  if (promo) words.push(`promotes to a ${PIECE[promo].toLowerCase()}`)
  return words.join(' ') + suffix
}

// A SAN token: piece moves, pawn moves/captures, castling, promotion (with optional move number "12." / "12…").
const SAN = /\b(?:\d+\.{1,3}|\d+…\s?)?(O-O-O|O-O|[KQRBN][a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?|[a-h]x[a-h][1-8](?:=[QRBN])?|[a-h][1-8]=[QRBN])[+#]?(?![\w-])/g

/** A move as Elias announces it on its own: "Pawn to e4", "Knight f3", "Queen takes f7, checkmate". */
export function spokenMove(san: string): string {
  return /^[a-h][1-8][+#]?$/.test(san) ? `Pawn to ${san.replace(/[+#]/g, '')}${san.includes('#') ? ', checkmate' : san.includes('+') ? ', check' : ''}` : sanToWords(san)
}

/**
 * Kids mode on screen: no chess notation. "with Qxf7#" -> "with queen takes f7, checkmate",
 * "Nf3 was stronger" -> "Knight f3 was stronger", "Play d4" -> "Play pawn to d4".
 */
export function notationToWords(text: string): string {
  return text
    .replace(SAN, (whole, _m, offset: number) => {
      const w = sanToWords(whole.replace(/^\d+(?:\.{1,3}|…)\s?/, ''))
      const startsSentence = offset === 0 || /[.!?:]\s*$/.test(text.slice(0, offset))
      return startsSentence ? w : w.charAt(0).toLowerCase() + w.slice(1)
    })
    .replace(/\b(Play|play|played|was|with|Next move:|Your move:)\s([a-h][1-8])\b(?![–-])/g, '$1 pawn to $2')
}

export function speakable(text: string): string {
  return (
    text
      // lesson emphasis in capitals ("CHECKMATE is…") — some voices spell capitals letter by letter
      .replace(/\b[A-Z]{3,}\b/g, (w) => (w === w.toUpperCase() && !/^[A-H][1-8]$/.test(w) ? w.toLowerCase() : w))
      // moves like Nf3, exd5, O-O, e8=Q, Qxf7#
      .replace(SAN, (whole) => {
        const core = whole.replace(/^\d+(?:\.{1,3}|…)\s?/, '')
        return sanToWords(core)
      })
      // "played d7–d5": a pawn's two-square move ("the pawn from d7 to d5", which the rule below leaves alone)
      .replace(/\b(played|play|Play)\s([a-h][1-8])[–-]([a-h][1-8])\b/g, '$1 the pawn from $2 to $3')
      // move numbers before pawn moves ("After 1.e4 e5") would read as the end of a sentence
      .replace(/\b\d+\.(?:\.\.)?\s?(?=[a-h][1-8]\b)/g, '')
      // single pawn moves after "Play"/"played"/"was"/"Better was" (e.g. "Better was d4.")
      .replace(/\b(Play|play|played|was|with|Next move:|Your move:)\s([a-h][1-8])\b/g, '$1 pawn to $2')
      // evaluations and symbols
      .replace(/([+−-])(\d+)\.(\d)\b/g, (_, sign, a, b) => `${sign === '+' ? 'plus' : 'minus'} ${a} point ${b}`)
      .replace(/−#(\d+)/g, 'mate in $1 against')
      .replace(/#(\d+)/g, 'mate in $1')
      .replace(/\?\?|\?!/g, '')
      .replace(/(\s)\?(?=\s)/g, '$1') // a lone "?" grade; no lookbehind (Safari < 16.4 can't parse it)
      .replace(/→/g, ' to ')
      .replace(/\s*[—–]\s*/g, ', ')
      .replace(/½/g, 'a half')
      .replace(/[★✓✗⭐🎉🌟🏆🏅⚡🔥]|\p{Extended_Pictographic}/gu, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
  )
}
