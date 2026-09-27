import { useEffect, useRef, useState } from 'react'
import { Chess, type Square } from 'chess.js'
import Board, { type BoardArrow, type BoardMark, type BoardMove } from './Board'
import { checkedKing, legalDests } from '../chess/game'
import { play } from '../lib/sound'
import type { Puzzle } from '../puzzles/model'

export type PuzzleStatus = 'starting' | 'play' | 'reply' | 'solved' | 'failed'

type Props = {
  puzzle: Puzzle
  coordinates: boolean
  /** Puzzle Rush: the first wrong move ends the puzzle. */
  strict?: boolean
  /** Called once: true only if solved with no wrong move and no hint. */
  onFirstResult: (success: boolean) => void
  /** Solved, failed (strict) or solution shown. */
  onFinish?: (solved: boolean) => void
  /** Status + message for the side panel. */
  onStatus?: (s: PuzzleStatus, message: string | null) => void
  /** increases to ask for the next hint level; set `solution` to play the answer out */
  hintRequest?: number
  solutionRequest?: number
  kids: boolean
}

const uciOf = (m: { from: string; to: string; promotion?: string }) => m.from + m.to + (m.promotion ?? '')

/**
 * One puzzle: plays the opponent's lead-in move, then checks each player move against the
 * solution (any checkmating move is also accepted) and answers with the next opponent move.
 */
export default function PuzzleBoard(p: Props) {
  const { puzzle, strict = false } = p
  const [chess] = useState(() => new Chess(puzzle.fen))
  // The solver is the side that moves after the lead-in. Fixed from the starting FEN: `chess`
  // itself changes as moves are played, so reading its turn later would flip the board.
  const player = puzzle.fen.split(' ')[1] === 'w' ? 'b' : 'w'
  const [idx, setIdx] = useState(0)
  const [status, setStatus] = useState<PuzzleStatus>('starting')
  const [last, setLast] = useState<{ from: Square; to: Square } | null>(null)
  const [animate, setAnimate] = useState(true)
  const [hint, setHint] = useState(0)
  const reported = useRef(false)
  const cb = useRef(p)
  useEffect(() => {
    cb.current = p
  })

  const report = (ok: boolean) => {
    if (reported.current) return
    reported.current = true
    cb.current.onFirstResult(ok)
  }
  const say = (s: PuzzleStatus, msg: string | null) => {
    setStatus(s)
    cb.current.onStatus?.(s, msg)
  }

  function playForced(i: number) {
    const uci = puzzle.moves[i]
    const m = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
    play(m.captured ? 'capture' : chess.inCheck() ? 'check' : 'move')
    setLast({ from: m.from, to: m.to })
    setAnimate(true)
    setIdx(i + 1)
    return m
  }

  // The opponent's lead-in move.
  useEffect(() => {
    const t = setTimeout(() => {
      playForced(0)
      say('play', null)
    }, strict ? 350 : 650)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function finish(solved: boolean, msg: string) {
    say(solved ? 'solved' : 'failed', msg)
    if (solved) play('correct')
    cb.current.onFinish?.(solved)
  }

  function onMove(input: BoardMove, viaDrag: boolean) {
    if (status !== 'play') return
    const expected = puzzle.moves[idx]
    const probe = new Chess(chess.fen())
    let m
    try {
      m = probe.move(input)
    } catch {
      return
    }
    // Like Lichess: the stored move, or any move that checkmates.
    const mates = probe.isCheckmate()
    if (uciOf(m) !== expected && !mates) {
      play('error')
      report(false)
      if (strict) {
        finish(false, p.kids ? 'Oops, not that one!' : 'Wrong move.')
        return
      }
      say('play', p.kids ? "That's not it — try again!" : 'Not the best move. Try again.')
      return
    }
    const done = chess.move(input)
    setLast({ from: done.from, to: done.to })
    setAnimate(!viaDrag)
    setHint(0)
    if (mates || idx + 1 >= puzzle.moves.length) {
      play(done.captured ? 'capture' : 'move')
      report(true)
      setIdx(idx + 1)
      finish(true, mates ? (p.kids ? 'Checkmate! You did it! 🎉' : 'Checkmate — solved!') : p.kids ? 'You solved it! ⭐' : 'Solved!')
      return
    }
    play(done.captured ? 'capture' : chess.inCheck() ? 'check' : 'move')
    say('reply', p.kids ? 'Yes! Keep going…' : 'Correct — keep going.')
    setIdx(idx + 1)
    setTimeout(() => {
      playForced(idx + 1)
      say('play', p.kids ? 'Your turn again!' : 'Your move.')
    }, 450)
  }

  // Hint levels: 1 = glow on the piece to move, 2 = the arrow.
  useEffect(() => {
    if (!p.hintRequest || status !== 'play') return
    report(false)
    setHint((h) => Math.min(2, h + 1))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.hintRequest])

  // Show the solution: play every remaining move, slowly.
  useEffect(() => {
    if (!p.solutionRequest || status === 'solved' || status === 'failed') return
    report(false)
    say('reply', 'Here is the solution…')
    let i = idx
    const step = () => {
      if (i >= puzzle.moves.length) {
        finish(false, p.kids ? 'Now you know the trick!' : 'That was the solution.')
        return
      }
      playForced(i)
      i++
      timer = setTimeout(step, 800)
    }
    let timer = setTimeout(step, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.solutionRequest])

  const next = status === 'play' ? puzzle.moves[idx] : null
  const marks: BoardMark[] = next && hint >= 1 ? [{ square: next.slice(0, 2) as Square, tone: 'hint' }] : []
  const arrows: BoardArrow[] = next && hint >= 2 ? [{ from: next.slice(0, 2) as Square, to: next.slice(2, 4) as Square, tone: 'hint' }] : []

  return (
    <div className={`puzzle-board s-${status}`} data-puzzle={puzzle.id}>
      <Board
        fen={chess.fen()}
        orientation={player}
        dests={status === 'play' ? legalDests(chess) : undefined}
        lastMove={last}
        animate={animate}
        ply={chess.history().length}
        check={checkedKing(chess)}
        coordinates={p.coordinates}
        onMove={onMove}
        marks={marks}
        arrows={arrows}
      />
    </div>
  )
}
