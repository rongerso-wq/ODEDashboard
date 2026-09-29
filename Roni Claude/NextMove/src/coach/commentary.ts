// Elias's commentary on the OPPONENT's move: what it threatens, what it takes, what it offers.
// Rules-only (instant, no engine), from the player's point of view. Quiet moves get no comment.
import { Chess, type Color, type Move } from 'chess.js'
import { hangingPieces, isDevelopment, isFork, listPieces, mateThreat, NAME, pieceAt } from './tactics'
import { sayComment, type PieceName } from './say'

/** `text` is shown; `say` is what Elias says (fixed, recorded sentences from coach/say.ts). */
export type Comment = { text: string; say: string; tone: 'danger' | 'info' | 'chance' }

const other = (c: Color): Color => (c === 'w' ? 'b' : 'w')

export function commentOnMove(m: Move, ply: number, o: { bot: string; kids: boolean }): Comment | null {
  const after = new Chess(m.after)
  if (after.isGameOver()) return null // the result screen does the talking
  const me = after.turn()
  const them = other(me)
  const who = o.bot
  const piece = NAME[m.piece]
  const p = piece as PieceName
  const kids = o.kids

  // 1. Check.
  if (after.inCheck()) {
    const fork = isFork(m.after, m)
    if (fork && fork.length >= 2)
      return {
        tone: 'danger',
        text: `Check, and a fork! ${who}'s ${piece} attacks your ${listPieces(fork)}. Save the king first.`,
        say: sayComment.checkFork(p),
      }
    return {
      tone: 'danger',
      text: kids
        ? `Check! ${who}'s ${piece} is attacking your king. Move the king, block, or capture the attacker!`
        : `Check from the ${piece} on ${m.to}. Move the king, block the check, or capture the checking piece.`,
      say: sayComment.check(p, kids),
    }
  }

  // 2. A mate threat.
  const threat = mateThreat(m.after)
  if (threat)
    return {
      tone: 'danger',
      text: kids
        ? `Careful! ${who} wants to checkmate you with ${threat.san}. Can you stop it?`
        : `Careful: ${who} threatens checkmate with ${threat.san}. Deal with that first.`,
      say: sayComment.mateThreat(who, kids),
    }

  // 3. A fork.
  const fork = isFork(m.after, m)
  if (fork)
    return {
      tone: 'danger',
      text: `A fork! ${who}'s ${piece} attacks your ${listPieces(fork)} at the same time.${
        kids ? ' You can only save one, so save the most valuable!' : ' Save the more valuable piece, or look for a counter-attack.'
      }`,
      say: sayComment.fork(p, kids),
    }

  // 4. A capture.
  if (m.captured) {
    const taken = NAME[m.captured]
    const t = taken as PieceName
    const theirsLoose = hangingPieces(after, them).some((t) => t.square === m.to)
    const recapture = after.moves({ verbose: true }).find((x) => x.to === m.to)
    if (recapture && theirsLoose)
      return { tone: 'chance', text: `${who} took your ${taken} on ${m.to}, but you can win it back with ${recapture.san}.`, say: sayComment.winBack(who, t) }
    if (recapture)
      return {
        tone: 'info',
        text: kids
          ? `${who} took your ${taken}. You can take back with ${recapture.san}, but check it is safe first!`
          : `${who} captured your ${taken} on ${m.to}. You can recapture with ${recapture.san}; check that it is safe.`,
        say: sayComment.recapture(who, t, kids),
      }
    return {
      tone: 'danger',
      text: kids
        ? `${who} won your ${taken}: nobody was protecting it. Always check which pieces are safe!`
        : `${who} won your ${taken} on ${m.to}: it was unprotected. Before each move, check which of your pieces are defended.`,
      say: sayComment.won(who, t, kids),
    }
  }

  // 5. The moved piece now attacks one of the player's pieces that is not safe.
  const mine = hangingPieces(after, me)
  const hit = mine.find((t) => after.attackers(t.square, them).includes(m.to))
  if (hit)
    return {
      tone: 'danger',
      text: kids
        ? `Watch out! ${who}'s ${piece} is attacking your ${NAME[hit.type]}. Move it to safety or protect it!`
        : `${who}'s ${piece} now attacks your ${pieceAt(hit)}. Move it or protect it.`,
      say: sayComment.attacks(NAME[hit.type] as PieceName, kids),
    }

  // 6. Something of the player's is already en prise (e.g. a discovered attack).
  if (mine[0] && mine[0].value >= 3)
    return { tone: 'danger', text: `Your ${pieceAt(mine[0])} is under attack and not safe.`, say: sayComment.enPrise(NAME[mine[0].type] as PieceName) }

  // 7. The opponent left something loose: a chance, without giving the answer away.
  const loose = hangingPieces(after, them)
  if (loose[0] && loose[0].value >= 3)
    return {
      tone: 'chance',
      text: kids ? `Look closely: one of ${who}'s pieces might not be protected!` : `Look carefully: one of ${who}'s pieces may be unprotected.`,
      say: sayComment.loose(who, kids),
    }

  // 8. Quiet but instructive moves.
  if (m.isKingsideCastle() || m.isQueensideCastle()) {
    const rights = after.fen().split(' ')[2]
    const canStillCastle = me === 'w' ? /[KQ]/.test(rights) : /[kq]/.test(rights)
    return {
      tone: 'info',
      text: `${who} castled to keep the king safe.${canStillCastle ? (kids ? ' Maybe you should castle too!' : ' Have you thought about castling too?') : ''}`,
      say: `${sayComment.castled(who)}${canStillCastle ? ` ${sayComment.castleToo(kids)}` : ''}`,
    }
  }
  if (ply < 12 && m.piece === 'q')
    return {
      tone: 'chance',
      text: kids
        ? `${who} brought the queen out early. Can you chase her while bringing out your pieces?`
        : `${who} brings the queen out early. Look for moves that develop a piece and attack her at the same time.`,
      say: sayComment.queenOut(who, kids),
    }
  if (ply < 12 && m.piece === 'p' && ['d4', 'e4', 'd5', 'e5', 'c4', 'c5'].includes(m.to))
    return { tone: 'info', text: `${who} fights for the centre with ${m.san}.`, say: sayComment.centre(who) }
  if (isDevelopment(m, ply) && ply < 16)
    return {
      tone: 'info',
      text: kids ? `${who} brings out a ${piece}. Bring out your pieces too!` : `${who} develops the ${piece}. Keep bringing your own pieces into play.`,
      say: sayComment.develops(who, p, kids),
    }
  return null
}
