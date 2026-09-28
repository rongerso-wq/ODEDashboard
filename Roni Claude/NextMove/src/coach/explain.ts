// Turns engine verdicts into plain-language feedback and hints.
import { Chess, type Move, type Square } from 'chess.js'
import type { Analysis } from './analysis'
import { uciToSan } from './analysis'
import { classify, formatEval, isMate, mateIn, type Grade } from './grade'
import {
  hangingPieces,
  isDevelopment,
  isFork,
  listPieces,
  mateInOne,
  mateThreat,
  moveFromUci,
  NAME,
  pieceAt,
  winsMaterial,
} from './tactics'

/** Who is being talked about. Live coaching: "You" vs "Pip"; local-game review: "White" vs "Black". */
export type Voice = { kids: boolean; your: string; opp: string }

export const youVoice = (opp: string, kids: boolean): Voice => ({ kids, your: 'your', opp })

export type Feedback = {
  grade: Grade
  title: string
  text: string
  san: string
  playedUci: string
  bestUci: string | null
  bestSan: string | null
  before: string // FEN before the move
  after: string // FEN after the move
  evalBefore: number // best achievable, mover's point of view
  evalAfter: number // after the played move, mover's point of view
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const TITLES: Record<Grade, { classic: string; kids: string }> = {
  best: { classic: 'Best move', kids: 'Super move! ⭐' },
  good: { classic: 'Good move', kids: 'Good move!' },
  inaccuracy: { classic: 'Inaccuracy', kids: 'Not bad — but there was better' },
  mistake: { classic: 'Mistake', kids: 'Oops!' },
  blunder: { classic: 'Blunder', kids: 'Oh no!' },
}

export const gradeTitle = (g: Grade, kids: boolean) => (kids ? TITLES[g].kids : TITLES[g].classic)

/** Why a (good) move is good, in one short sentence; null if nothing specific stands out. */
function whyGood(before: string, m: Move, ply: number, voice: Voice): string | null {
  if (m.san.includes('#')) return voice.kids ? 'Checkmate! You did it! 🎉' : 'Checkmate.'
  const threat = mateThreat(before)
  if (threat && !mateInOne(m.after)) return `That stops the checkmate threat ${threat.san}.`
  const fork = isFork(m.after, m)
  if (fork) return `A fork! The ${NAME[m.piece]} attacks the ${listPieces(fork)} at the same time.`
  const won = winsMaterial(before, m)
  if (won) return `That wins a ${NAME[won.type]}.`
  const inDanger = hangingPieces(new Chess(before), m.color).some((t) => t.square === m.from)
  if (inDanger && !hangingPieces(new Chess(m.after), m.color).some((t) => t.square === m.to))
    return `That gets the ${NAME[m.piece]} out of danger.`
  if (m.isKingsideCastle() || m.isQueensideCastle()) return 'Castling tucks the king away safely and brings the rook into play.'
  if (isDevelopment(m, ply)) return 'Good development — a new piece joins the game.'
  if (m.san.includes('+')) return 'A check that keeps the pressure on.'
  return null
}

/**
 * Feedback for a move. `before` is the analysis of the position the move was played in,
 * `after` the analysis of the resulting position (so its score is from the opponent's side).
 */
export function explainMove(p: { move: Move; ply: number; before: Analysis; after: Analysis; voice: Voice }): Feedback {
  const { move: m, ply, before, after, voice } = p
  const evalBefore = before.cp
  const evalAfter = -after.cp
  const playedUci = m.lan
  const grade = classify(evalBefore, evalAfter, before.best === playedUci)
  const bestSan = uciToSan(before.fen, before.best)
  const best = before.best ? moveFromUci(before.fen, before.best) : null
  const reply = after.best ? moveFromUci(after.fen, after.best) : null
  const replySan = reply?.san ?? null

  let text: string
  if (grade === 'best' || grade === 'good') {
    const why = whyGood(before.fen, m, ply, voice)
    if (grade === 'best') text = why ?? (voice.kids ? "That's exactly what a champion would play!" : "That's the move a strong player would choose.")
    else text = `${why ? why + ' ' : 'Solid. '}${bestSan ? `${bestSan} was slightly stronger.` : ''}`.trim()
  } else {
    text = whatWentWrong({ m, ply, before, after, best, bestSan, reply, replySan, evalBefore, evalAfter, voice })
  }

  return {
    grade,
    title: gradeTitle(grade, voice.kids),
    text,
    san: m.san,
    playedUci,
    bestUci: before.best,
    bestSan,
    before: before.fen,
    after: after.fen,
    evalBefore,
    evalAfter,
  }
}

function whatWentWrong(x: {
  m: Move
  ply: number
  before: Analysis
  after: Analysis
  best: Move | null
  bestSan: string | null
  reply: Move | null
  replySan: string | null
  evalBefore: number
  evalAfter: number
  voice: Voice
}): string {
  const { m, after, best, bestSan, reply, replySan, evalBefore, evalAfter, voice } = x
  const better = bestSan ? ` Better was ${bestSan}.` : ''

  // 1. A checkmate was there and was missed.
  if (isMate(evalBefore) && evalBefore > 0 && !(isMate(evalAfter) && evalAfter > 0)) {
    const n = mateIn(evalBefore)
    return n === 1
      ? `There was checkmate in one: ${bestSan}!`
      : `There was a forced checkmate in ${n} moves, starting with ${bestSan}.`
  }

  // 2. The move allows the opponent to checkmate.
  if (isMate(after.cp) && after.cp > 0) {
    const n = mateIn(after.cp)
    return n === 1
      ? `This lets ${voice.opp} checkmate with ${replySan}.${better}`
      : `This lets ${voice.opp} force checkmate in ${n} moves.${better}`
  }

  // 3. A piece is left where it can be won.
  const hanging = hangingPieces(new Chess(after.fen), m.color)
  const taken = reply ? hanging.find((h) => h.square === reply.to) : undefined
  if (taken && reply?.captured)
    return `${cap(voice.your)} ${pieceAt(taken)} can be taken — ${voice.opp} plays ${replySan}.${better}`
  const moved = hanging.find((h) => h.square === m.to)
  if (moved && moved.value >= 3) return `The ${NAME[moved.type]} on ${m.to} is left unprotected and can be captured.${better}`

  // 4. The better move won material.
  if (best) {
    const won = winsMaterial(x.before.fen, best)
    if (won) return `A free ${NAME[won.type]} was there: ${bestSan} wins it.`
    const fork = isFork(best.after, best)
    if (fork) return `${bestSan} would have attacked the ${listPieces(fork)} at the same time.`
  }

  // 5. The reply wins something.
  if (reply?.captured) return `After this, ${voice.opp} can play ${replySan}.${better}`

  // 6. An opening principle was broken.
  const rule = openingPrinciple(m, x.ply, voice.kids)
  if (rule) return `${rule}${better}`

  // 7. Generic.
  if (voice.kids) return bestSan ? `${bestSan} was a stronger move. Keep looking for checks, captures and threats!` : 'There was a stronger move here.'
  return `${bestSan ? `${bestSan} was better` : 'There was a better move'}. The position goes from ${evalWords(evalBefore)} to ${evalWords(evalAfter)} (${formatEval(evalBefore)} → ${formatEval(evalAfter)}).`
}

/** The classic opening advice a coach would give about this move, if any applies. */
function openingPrinciple(m: Move, ply: number, kids: boolean): string | null {
  if (ply >= 16) return null
  if (m.piece === 'q' && ply < 12)
    return kids
      ? 'The queen came out too early — the other side can chase her around. Bring out knights and bishops first!'
      : 'Bringing the queen out early lets the opponent attack it while developing. Develop knights and bishops first.'
  if (m.piece === 'k' && !m.isKingsideCastle() && !m.isQueensideCastle())
    return kids ? 'Moving the king means you can’t castle any more. Keep the king safe by castling!' : 'Moving the king gives up castling. Aim to castle early instead.'
  if (m.piece === 'n' && (m.to[0] === 'a' || m.to[0] === 'h'))
    return kids ? '"A knight on the rim is dim" — knights are stronger in the middle.' : '"A knight on the rim is dim": on the edge it controls fewer squares.'
  if (m.piece === 'p' && 'abgh'.includes(m.from[0]) && ply < 10)
    return kids ? 'Early on, move the middle pawns and bring out your pieces.' : 'In the opening, fight for the centre and develop pieces rather than pushing edge pawns.'
  return null
}

/** "about equal", "slightly better", "losing" … (for the side whose score it is) */
export function evalWords(cp: number): string {
  if (isMate(cp)) return cp > 0 ? 'a forced checkmate' : 'getting checkmated'
  const a = Math.abs(cp)
  const side = cp > 0
  if (a <= 30) return 'about equal'
  if (a <= 100) return side ? 'slightly better' : 'slightly worse'
  if (a <= 250) return side ? 'better' : 'worse'
  if (a <= 600) return side ? 'much better' : 'much worse'
  return side ? 'winning' : 'losing'
}

export type Hint = { level: 1 | 2 | 3; text: string; square?: Square; arrow?: { from: Square; to: Square } }

/** Three-step hint for the side to move: an idea, then the piece, then the move. */
export function hintFor(a: Analysis, level: 1 | 2 | 3, ply: number, kids: boolean): Hint | null {
  const best = a.best ? moveFromUci(a.fen, a.best) : null
  if (!best) return null
  const chess = new Chess(a.fen)
  const mateSoon = isMate(a.cp) && a.cp > 0 && mateIn(a.cp) <= 3
  const won = winsMaterial(a.fen, best)
  const saving = hangingPieces(chess, best.color).some((t) => t.square === best.from)
  const fork = isFork(best.after, best)
  const castle = best.isKingsideCastle() || best.isQueensideCastle()
  const threat = mateThreat(a.fen)
  const stopsThreat = threat && !mateInOne(best.after)

  if (level === 1) {
    let text: string
    if (mateSoon) text = kids ? "There's a checkmate hiding here! Look at every check." : "There's a forced checkmate. Look at every check."
    else if (threat)
      text = kids
        ? `Watch out! Your opponent wants to checkmate you with ${threat.san}. How can you stop it?`
        : `Careful: your opponent threatens checkmate with ${threat.san}. How do you stop it?`
    else if (won) text = kids ? 'Something can be captured for free! Can you find it?' : 'You can win material. Is anything of theirs unprotected?'
    else if (saving) text = kids ? 'One of your pieces is in danger! Can you save it?' : 'One of your pieces is under attack. Deal with the threat.'
    else if (fork) text = 'Look for a move that attacks two pieces at once.'
    else if (best.san.includes('+')) text = 'Look for a check.'
    else if (castle) text = "Think about your king's safety."
    else if (isDevelopment(best, ply)) text = kids ? 'Bring a new piece out to play!' : 'Bring a new piece into the game.'
    else text = kids ? 'Look at every check, capture and threat!' : 'Look at every check, capture and threat — for both sides.'
    return { level, text }
  }
  if (level === 2) return { level, text: `Look at your ${NAME[best.piece]} on ${best.from}.`, square: best.from }

  let why = "It's the strongest move here."
  if (best.san.includes('#')) why = "It's checkmate!"
  else if (mateSoon) why = 'It starts a forced checkmate.'
  else if (threat && stopsThreat) why = `It stops the checkmate threat ${threat.san}.`
  else if (fork) why = `It attacks the ${listPieces(fork)} at once.`
  else if (won) why = `It wins a ${NAME[won.type]}.`
  else if (saving) why = `It saves your ${NAME[best.piece]}.`
  else if (castle) why = 'It keeps your king safe.'
  else if (best.san.includes('+')) why = 'It gives check.'
  else if (isDevelopment(best, ply)) why = 'It develops a piece.'
  return { level, text: `Play ${best.san}. ${why}`, square: best.from, arrow: { from: best.from, to: best.to } }
}
