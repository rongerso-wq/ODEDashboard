import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Color } from 'chess.js'
import { Engine } from '../engine/engine'
import type { ChessGame } from '../chess/useChessGame'
import { AnalysisCache } from './analysis'
import { explainMove, hintFor, type Feedback, type Hint, type Voice } from './explain'
import type { Grade } from './grade'

/**
 * Live coach for one player (`me`): grades each of their moves shortly after it is played,
 * and gives a three-step hint on request. Uses its own engine so the opponent bot never waits.
 */
export function useCoach(game: ChessGame, me: Color, enabled: boolean, voice: Voice) {
  const engineRef = useRef<Engine | null>(null)
  const cacheRef = useRef<AnalysisCache | null>(null)
  const cache = useCallback(() => {
    if (!cacheRef.current) {
      engineRef.current = new Engine()
      cacheRef.current = new AnalysisCache(engineRef.current)
    }
    return cacheRef.current
  }, [])
  useEffect(
    () => () => {
      engineRef.current?.terminate()
      engineRef.current = null
      cacheRef.current = null
    },
    [],
  )

  const over = !!game.outcome
  const { history } = game

  // Feedback per move, keyed by ply + resulting position so take-backs never show stale advice.
  const [results, setResults] = useState<Record<string, Feedback>>({})
  let lastMine = -1
  for (let i = history.length - 1; i >= 0; i--)
    if (history[i].color === me) {
      lastMine = i
      break
    }
  const key = lastMine >= 0 ? `${lastMine}:${history[lastMine].after}` : null

  // Look at the position ahead of time whenever it's the player's turn: hints and grading reuse it.
  useEffect(() => {
    if (!enabled || over || game.turn !== me) return
    void cache().get(game.fen)
  }, [enabled, over, game.fen, game.turn, me, cache])

  const voiceRef = useRef(voice)
  useEffect(() => {
    voiceRef.current = voice
  })

  useEffect(() => {
    if (!enabled || !key || results[key]) return
    const m = history[lastMine]
    let cancelled = false
    Promise.all([cache().get(m.before), cache().get(m.after)]).then(([before, after]) => {
      if (cancelled || !before || !after) return
      const fb = explainMove({ move: m, ply: lastMine, before, after, voice: voiceRef.current })
      setResults((r) => ({ ...r, [key]: fb }))
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key])

  const grades = useMemo(() => {
    const g: (Grade | undefined)[] = []
    history.forEach((m, i) => {
      g[i] = results[`${i}:${m.after}`]?.grade
    })
    return g
  }, [history, results])

  // ---- hints ----
  const [hint, setHint] = useState<{ fen: string; hint: Hint } | null>(null)
  const [hintLoading, setHintLoading] = useState(false)
  const currentHint = hint?.fen === game.fen ? hint.hint : null

  const askHint = useCallback(async () => {
    const fen = game.fen
    const level = (currentHint ? Math.min(3, currentHint.level + 1) : 1) as 1 | 2 | 3
    setHintLoading(true)
    const a = await cache().get(fen)
    setHintLoading(false)
    if (!a) return
    const h = hintFor(a, level, game.ply, voiceRef.current.kids)
    if (h) setHint({ fen, hint: h })
  }, [game.fen, game.ply, currentHint, cache])

  return {
    feedback: key ? (results[key] ?? null) : null,
    pending: enabled && !!key && !results[key],
    lastMinePly: lastMine,
    grades,
    hint: currentHint,
    hintLoading,
    askHint,
  }
}

export type Coach = ReturnType<typeof useCoach>
