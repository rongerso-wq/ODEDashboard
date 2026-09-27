import { useCallback, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { checkedKing, legalDests, outcomeOf, soundFor, type Move, type Outcome, type Square } from './game'
import { play, vibrate } from '../lib/sound'

export type MoveInput = { from: Square; to: Square; promotion?: string }

/** One chess game: wraps chess.js and re-renders React on every change. */
export function useChessGame(startFen?: string, startMoves: string[] = []) {
  const chessRef = useRef<Chess>(null as unknown as Chess)
  if (chessRef.current === null) {
    chessRef.current = new Chess(startFen)
    // Replay a saved game; stop quietly at the first move that no longer fits.
    for (const san of startMoves) {
      try {
        chessRef.current.move(san)
      } catch {
        break
      }
    }
  }
  const chess = chessRef.current

  const [version, setVersion] = useState(0)
  const [animate, setAnimate] = useState(false)
  const [manualOutcome, setManualOutcome] = useState<Outcome | null>(null)

  const bump = () => setVersion((v) => v + 1)

  const move = useCallback(
    (input: MoveInput, opts: { animate?: boolean } = {}): Move | null => {
      let m: Move
      try {
        m = chess.move(input)
      } catch {
        play('error')
        return null
      }
      const over = outcomeOf(chess)
      play(over ? 'end' : soundFor(m, chess))
      if (m.isCapture()) vibrate(15)
      setAnimate(opts.animate ?? true)
      bump()
      return m
    },
    [chess],
  )

  const undo = useCallback(
    (plies = 1) => {
      for (let i = 0; i < plies; i++) if (!chess.undo()) break
      setManualOutcome(null)
      setAnimate(false)
      bump()
    },
    [chess],
  )

  const reset = useCallback(
    (fen?: string) => {
      if (fen) chess.load(fen)
      else chess.reset()
      setManualOutcome(null)
      setAnimate(false)
      bump()
    },
    [chess],
  )

  const finish = useCallback((o: Outcome) => {
    play('end')
    setManualOutcome(o)
  }, [])

  // Everything below derives from the position; recomputed only when it changes.
  const derived = useMemo(() => {
    const history = chess.history({ verbose: true })
    const last = history.at(-1) ?? null
    return {
      fen: chess.fen(),
      turn: chess.turn(),
      history,
      lastMove: last ? { from: last.from, to: last.to } : null,
      dests: legalDests(chess),
      check: checkedKing(chess),
      rulesOutcome: outcomeOf(chess),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chess, version])

  const outcome = manualOutcome ?? derived.rulesOutcome

  return { chess, ...derived, outcome, animate, ply: derived.history.length, move, undo, reset, finish }
}

export type ChessGame = ReturnType<typeof useChessGame>
