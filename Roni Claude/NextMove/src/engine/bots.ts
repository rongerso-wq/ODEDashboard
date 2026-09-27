import type { Chess, Move, PieceSymbol } from 'chess.js'
import type { SearchOptions } from './engine'

export type Bot = {
  id: string
  name: string
  piece: PieceSymbol // avatar
  hue: number // avatar background
  level: number // 1–8
  strength: string // rough, shown as "about …"
  classic: string
  kids: string
  greet: { classic: string; kids: string }
  onWin: string // the bot won
  onLose: string // the bot lost
  /** chance of playing a random legal move instead of the engine's choice */
  randomness: number
  search: SearchOptions
}

// Stockfish's lowest Skill Level still beats most beginners, so the first bots mix in random
// moves. Strength labels are rough estimates, shown as "about".
export const BOTS: Bot[] = [
  {
    id: 'pip',
    name: 'Pip',
    piece: 'p',
    hue: 145,
    level: 1,
    strength: 'Beginner',
    classic: 'Just learned how the pieces move. Perfect for your very first games.',
    kids: 'Pip is a little pawn who is still learning. Great for your first game!',
    greet: { classic: "Hi! I'm still learning too. Go easy on me?", kids: "Hi! I'm Pip! Let's have fun!" },
    onWin: 'I won?! Wow, I surprised myself!',
    onLose: 'You got me! You play really well!',
    randomness: 0.65,
    search: { skill: 0, depth: 1 },
  },
  {
    id: 'nora',
    name: 'Nora',
    piece: 'n',
    hue: 190,
    level: 2,
    strength: '400',
    classic: 'Knows the rules, loves to jump around with her knights, often leaves pieces hanging.',
    kids: 'Nora the Knight loves to hop around. Watch out for her jumps!',
    greet: { classic: 'Ready? My knights are feeling jumpy today!', kids: 'Hop hop! Ready to play?' },
    onWin: 'Gotcha! Want a rematch?',
    onLose: 'Nice game! You saw more than me.',
    randomness: 0.38,
    search: { skill: 0, depth: 2 },
  },
  {
    id: 'benny',
    name: 'Benny',
    piece: 'b',
    hue: 265,
    level: 3,
    strength: '650',
    classic: 'Sees simple captures and threats, but misses two-move ideas.',
    kids: 'Benny the Bishop likes long diagonal moves. Can you trick him?',
    greet: { classic: 'Diagonals are my favourite. Good luck!', kids: 'Zoom! I move on diagonals. Good luck!' },
    onWin: 'Ha! The long diagonal strikes again.',
    onLose: "Well played — I didn't see that coming.",
    randomness: 0.2,
    search: { skill: 1, depth: 3 },
  },
  {
    id: 'rosa',
    name: 'Rosa',
    piece: 'r',
    hue: 12,
    level: 4,
    strength: '900',
    classic: 'A solid club beginner. Punishes free pieces, still blunders under pressure.',
    kids: 'Rosa the Rook is strong and steady. You need to think carefully!',
    greet: { classic: "Let's see what you've got.", kids: "I'm strong like a castle! Let's go!" },
    onWin: 'Steady wins the race. Try again?',
    onLose: 'Impressive. You earned that one.',
    randomness: 0.08,
    search: { skill: 3, depth: 5 },
  },
  {
    id: 'quinn',
    name: 'Quinn',
    piece: 'q',
    hue: 330,
    level: 5,
    strength: '1200',
    classic: 'Plays real openings and simple tactics. A good test for improving players.',
    kids: 'Queen Quinn is very clever. Only chess heroes can beat her!',
    greet: { classic: 'I know my openings. Do you?', kids: 'A queen never gives up. Ready?' },
    onWin: 'The queen keeps her crown. For now.',
    onLose: 'Brilliant! You outplayed me.',
    randomness: 0.03,
    search: { skill: 6, depth: 8 },
  },
  {
    id: 'professor',
    name: 'The Professor',
    piece: 'k',
    hue: 40,
    level: 6,
    strength: '1500',
    classic: 'Positional and patient. Makes you earn every point.',
    kids: 'The Professor has read every chess book. Super hard!',
    greet: { classic: 'Chess is a lesson in patience. Shall we begin?', kids: "Hmm, let's think carefully together." },
    onWin: 'A good lesson — study it and come back stronger.',
    onLose: 'Excellent. I have nothing left to teach you… almost.',
    randomness: 0,
    search: { skill: 10, depth: 10, movetime: 700 },
  },
  {
    id: 'kasimir',
    name: 'Master Kasimir',
    piece: 'n',
    hue: 220,
    level: 7,
    strength: '1900',
    classic: 'Club master strength. Sharp tactics and clean endgames.',
    kids: 'Master Kasimir is a chess master. Only for the bravest!',
    greet: { classic: 'I hope you came prepared.', kids: 'Only brave players challenge me. Welcome!' },
    onWin: 'Precision wins games.',
    onLose: 'A master-class. My respect.',
    randomness: 0,
    search: { skill: 15, depth: 14, movetime: 1000 },
  },
  {
    id: 'nova',
    name: 'Grandmaster Nova',
    piece: 'q',
    hue: 280,
    level: 8,
    strength: '2500+',
    classic: 'Full engine strength. Beating her is a genuine achievement.',
    kids: "Nova is the strongest of all. Can anyone beat her? Maybe you — one day!",
    greet: { classic: 'Show me your best chess.', kids: "I'm the final boss! Good luck!" },
    onWin: 'As calculated.',
    onLose: 'Incredible. You beat the Grandmaster!',
    randomness: 0,
    search: { skill: 20, movetime: 1500 },
  },
]

export const botById = (id: string) => BOTS.find((b) => b.id === id) ?? BOTS[0]

/** A random legal move; captures are a bit more tempting (weaker bots love grabbing pieces). */
export function randomMove(chess: Chess, rand: () => number = Math.random): Move | null {
  const moves = chess.moves({ verbose: true })
  if (moves.length === 0) return null
  const weights = moves.map((m) => (m.isCapture() ? 2.5 : 1))
  let r = rand() * weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < moves.length; i++) {
    r -= weights[i]
    if (r <= 0) return moves[i]
  }
  return moves[moves.length - 1]
}
