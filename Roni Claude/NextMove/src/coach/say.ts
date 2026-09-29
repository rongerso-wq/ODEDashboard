// What Elias SAYS during games, puzzles, review and practice. The screen shows the full detail
// (squares, moves, evaluations); speech uses these fixed sentences, so every one of them can be
// recorded whole in Elias's voice (npm run voice). Parameters are limited to short fixed lists
// (a piece, an opponent's name, a number in a range), and `spokenCatalog()` lists every sentence.
// Rule: anything Elias says during play must come from here; the voice coverage test enforces it.
// No imports with side effects: Node runs this file too (scripts/voice/collect.ts).

export const PIECES = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'] as const
export type PieceName = (typeof PIECES)[number]
/** Pieces that can be captured, forked or left hanging (never the king). */
const TARGETS = PIECES.filter((p) => p !== 'king')
/** The eight opponents (engine/bots.ts) plus the neutral name used elsewhere. */
export const OPPONENTS = ['Pip', 'Nora', 'Benny', 'Rosa', 'Quinn', 'The Professor', 'Master Kasimir', 'Grandmaster Nova', 'Your opponent'] as const

// ---------- The coach on your own move (explain.ts) ----------
export const sayGood = {
  mate: (kids: boolean) => (kids ? 'Checkmate! You did it!' : 'Checkmate.'),
  stopsThreat: 'That stops the checkmate threat.',
  fork: (p: PieceName) => `A fork! The ${p} attacks two pieces at the same time.`,
  wins: (p: PieceName) => `That wins a ${p}.`,
  saves: (p: PieceName) => `That gets the ${p} out of danger.`,
  castle: 'Castling tucks the king away safely and brings the rook into play.',
  develop: 'Good development. A new piece joins the game.',
  check: 'A check that keeps the pressure on.',
  best: (kids: boolean) => (kids ? "That's exactly what a champion would play!" : "That's the move a strong player would choose."),
  solid: 'Solid.',
  slightlyBetter: 'There was a slightly stronger move.',
}

export const EVAL_WORDS = ['a forced checkmate', 'getting checkmated', 'about equal', 'slightly better', 'slightly worse', 'better', 'worse', 'much better', 'much worse', 'winning', 'losing'] as const

export const sayWrong = {
  missedMate1: 'There was a checkmate in one!',
  missedMate: 'There was a forced checkmate!',
  allowsMate1: 'This lets your opponent checkmate you.',
  allowsMate: 'This lets your opponent force a checkmate.',
  canBeTaken: (p: PieceName) => `Your ${p} can be taken!`,
  leftLoose: (p: PieceName) => `The ${p} is left unprotected and can be captured.`,
  freePiece: (p: PieceName) => `A free ${p} was there to win.`,
  missedFork: 'There was a fork: one move attacked two pieces at once.',
  replyWins: 'After this, your opponent can win material.',
  better: 'There was a better move.',
  strongerKids: 'There was a stronger move. Keep looking for checks, captures and threats!',
  now: (w: (typeof EVAL_WORDS)[number]) => `The position is now ${w}.`,
}

// ---------- Hints (explain.ts hintFor) ----------
export const sayHint = {
  threatKids: 'Watch out! Your opponent wants to checkmate you. How can you stop it?',
  threat: 'Careful: your opponent threatens checkmate. How do you stop it?',
  lookAt: (p: PieceName) => `Look at your ${p}.`,
  play: 'Play the move the arrow shows.',
  whyMate: "It's checkmate!",
  whyMateSoon: 'It starts a forced checkmate.',
  whyStops: 'It stops the checkmate threat.',
  whyFork: 'It attacks two pieces at once.',
  whyWins: (p: PieceName) => `It wins a ${p}.`,
  whySaves: (p: PieceName) => `It saves your ${p}.`,
  whyCastle: 'It keeps your king safe.',
  whyCheck: 'It gives check.',
  whyDevelop: 'It develops a piece.',
  whyStrongest: "It's the strongest move here.",
}

// ---------- The opponent's move (commentary.ts) ----------
export const sayComment = {
  checkFork: (p: PieceName) => `Check, and a fork! The ${p} attacks two of your pieces. Save the king first.`,
  check: (p: PieceName, kids: boolean) =>
    kids ? `Check! The ${p} is attacking your king. Move the king, block, or capture the attacker!` : `Check from the ${p}! Move the king, block the check, or capture the checking piece.`,
  mateThreat: (who: string, kids: boolean) =>
    kids ? `Careful! ${who} wants to checkmate you. Can you stop it?` : `Careful: ${who} threatens checkmate. Deal with that first.`,
  fork: (p: PieceName, kids: boolean) =>
    `A fork! The ${p} attacks two of your pieces at the same time. ${kids ? 'You can only save one, so save the most valuable!' : 'Save the more valuable piece, or look for a counter-attack.'}`,
  winBack: (who: string, p: PieceName) => `${who} took your ${p}, but you can win it back!`,
  recapture: (who: string, p: PieceName, kids: boolean) =>
    kids ? `${who} took your ${p}. You can take back, but check it is safe first!` : `${who} captured your ${p}. You can recapture; check that it is safe.`,
  won: (who: string, p: PieceName, kids: boolean) =>
    kids ? `${who} won your ${p}: nobody was protecting it. Always check which pieces are safe!` : `${who} won your ${p}: it was unprotected. Before each move, check which of your pieces are defended.`,
  attacks: (p: PieceName, kids: boolean) => (kids ? `Watch out! Your ${p} is under attack. Move it to safety or protect it!` : `Your ${p} is under attack. Move it or protect it.`),
  enPrise: (p: PieceName) => `Your ${p} is under attack and not safe.`,
  loose: (who: string, kids: boolean) => (kids ? `Look closely: one of ${who}'s pieces might not be protected!` : `Look carefully: one of ${who}'s pieces may be unprotected.`),
  castled: (who: string) => `${who} castled to keep the king safe.`,
  castleToo: (kids: boolean) => (kids ? 'Maybe you should castle too!' : 'Have you thought about castling too?'),
  queenOut: (who: string, kids: boolean) =>
    kids ? `${who} brought the queen out early. Can you chase her while bringing out your pieces?` : `${who} brings the queen out early. Look for moves that develop a piece and attack her at the same time.`,
  centre: (who: string) => `${who} fights for the centre.`,
  develops: (who: string, p: PieceName, kids: boolean) =>
    kids ? `${who} brings out a ${p}. Bring out your pieces too!` : `${who} develops the ${p}. Keep bringing your own pieces into play.`,
}

// ---------- Review (screens/Review.tsx) ----------
export const sayReview = {
  start: "Let's look at the game together.",
  accuracy: (n: number) => `Your accuracy was ${n} percent.`,
  clean: 'No serious mistakes. Well played!',
  moments: (n: number) => (n === 1 ? 'There was one moment worth a closer look.' : `There were ${n} moments worth a closer look.`),
  stepThrough: 'Let us step through them together.',
  playedWell: 'Well played here.',
}

// ---------- My mistakes (screens/MistakesPractice.tsx) ----------
export const sayPractice = {
  intro: (who: string, kids: boolean) =>
    kids ? `Remember your game against ${who}? Oops! Can you find a better move?` : `In your game against ${who}, there was a better move here. Can you find it?`,
  alsoWorks: (kids: boolean) => (kids ? 'That works too!' : 'That works as well.'),
  right: (kids: boolean) => (kids ? 'Yes! That is the move.' : 'Correct.'),
  shown: (kids: boolean) => (kids ? 'Here is the move.' : 'Here is the answer.'),
  session: (all: boolean) => (all ? 'Every one solved at the first try. Wonderful!' : 'Session complete. Well done for practising!'),
  nothingDue: 'Nothing to practise right now.',
  when: (days: number) => (days === 1 ? 'See you tomorrow!' : `See you in ${days} days!`),
}

// ---------- Puzzles (screens/PuzzlePlay.tsx) ----------
export const sayPuzzle = {
  prompt: (color: 'White' | 'Black', kids: boolean) => (kids ? `You are ${color}. Find the best move!` : `${color} to move. Find the best move.`),
}

// ---------- Academy and lessons with numbers ----------
export const sayAcademy = {
  stars: (n: number) => (n === 1 ? 'You have one star already.' : `You have ${n} stars already.`),
  nextUp: (title: string) => `Next up: ${title}.`,
}
export const sayLesson = {
  movesDone: (n: number) => `You did it in ${n} moves!`,
  canBeDone: (n: number) => `It can be done in ${n}.`,
  usedMoves: (n: number) => `You have used your ${n} moves.`,
  perfect: (n: number) => `Perfect — ${n} moves, the fewest possible.`,
  done: (n: number) => `Done in ${n} moves.`,
  tryForPerfect: (n: number) => `It can be done in ${n} — try again for a perfect score, or continue.`,
}

/** Every sentence above, with every allowed parameter, for recording. */
export function spokenCatalog(lessonTitles: string[] = []): string[] {
  const out: string[] = []
  const add = (...s: string[]) => out.push(...s)
  const both = [false, true]
  for (const v of Object.values({ ...sayGood, ...sayWrong, ...sayHint, ...sayReview }))
    if (typeof v === 'string') add(v)
  for (const k of both) add(sayGood.mate(k), sayGood.best(k), sayComment.castleToo(k), sayPractice.alsoWorks(k), sayPractice.right(k), sayPractice.shown(k))
  for (const p of TARGETS)
    add(sayGood.wins(p), sayGood.saves(p), sayWrong.canBeTaken(p), sayWrong.leftLoose(p), sayWrong.freePiece(p), sayHint.whyWins(p), sayHint.whySaves(p), sayComment.enPrise(p))
  for (const p of PIECES) add(sayGood.fork(p), sayHint.lookAt(p), sayComment.checkFork(p))
  for (const w of EVAL_WORDS) add(sayWrong.now(w))
  for (const k of both) for (const p of PIECES) add(sayComment.check(p, k), sayComment.fork(p, k))
  for (const k of both) for (const p of TARGETS) add(sayComment.attacks(p, k))
  for (const who of OPPONENTS) {
    add(sayComment.castled(who), sayComment.centre(who))
    for (const k of both) {
      add(sayComment.mateThreat(who, k), sayComment.loose(who, k), sayComment.queenOut(who, k), sayPractice.intro(who, k))
      for (const p of ['knight', 'bishop'] as const) add(sayComment.develops(who, p, k)) // tactics.isDevelopment
      for (const p of TARGETS) add(sayComment.recapture(who, p, k), sayComment.won(who, p, k))
    }
    for (const p of TARGETS) add(sayComment.winBack(who, p))
  }
  for (let n = 0; n <= 100; n++) add(sayReview.accuracy(n))
  for (let n = 1; n <= 60; n++) add(sayReview.moments(n))
  for (const k of both) add(sayPractice.session(k), sayPuzzle.prompt('White', k), sayPuzzle.prompt('Black', k))
  add(sayPractice.nothingDue)
  for (let d = 1; d <= 60; d++) add(sayPractice.when(d))
  for (let n = 1; n <= 120; n++) add(sayAcademy.stars(n))
  for (const t of lessonTitles) add(sayAcademy.nextUp(t))
  for (let n = 1; n <= 40; n++)
    add(sayLesson.movesDone(n), sayLesson.canBeDone(n), sayLesson.usedMoves(n), sayLesson.perfect(n), sayLesson.done(n), sayLesson.tryForPerfect(n))
  return out
}
