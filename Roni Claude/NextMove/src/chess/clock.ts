import { useCallback, useEffect, useRef, useState } from 'react'
import type { Color } from 'chess.js'

export type TimeControl = { id: string; label: string; kind: string; minutes: number; increment: number }

// Plain words, not chess jargon (Bullet/Blitz/Rapid, "3 | 2"): a parent new to chess reads these.
export const TIME_CONTROLS: TimeControl[] = [
  { id: '1+0', label: '1 min', kind: 'Very fast', minutes: 1, increment: 0 },
  { id: '3+2', label: '3 min + 2 s', kind: 'Fast, +2 s a move', minutes: 3, increment: 2 },
  { id: '5+0', label: '5 min', kind: 'Fast', minutes: 5, increment: 0 },
  { id: '10+0', label: '10 min', kind: 'Steady', minutes: 10, increment: 0 },
  { id: '15+10', label: '15 min + 10 s', kind: 'Steady, +10 s a move', minutes: 15, increment: 10 },
  { id: '30+0', label: '30 min', kind: 'Slow', minutes: 30, increment: 0 },
]

export const timeControlById = (id: string | null) => TIME_CONTROLS.find((t) => t.id === id) ?? null

/**
 * Clock state. `running` side's time is counted from `since` (a performance.now() stamp);
 * the stored `w`/`b` values are what was left when that side's turn began.
 */
export type ClockState = { w: number; b: number; running: Color | null; since: number; increment: number }

export function newClock(tc: TimeControl): ClockState {
  const ms = tc.minutes * 60_000
  return { w: ms, b: ms, running: null, since: 0, increment: tc.increment * 1000 }
}

export function remaining(s: ClockState, c: Color, now: number): number {
  // `now` may be an older tick than `since`; elapsed time is never negative.
  return s.running === c ? Math.max(0, s[c] - Math.max(0, now - s.since)) : s[c]
}

/** `mover` just moved: stop their clock, add the increment, start the opponent's. */
export function afterMove(s: ClockState, mover: Color, now: number): ClockState {
  const next: ClockState = { ...s, running: mover === 'w' ? 'b' : 'w', since: now }
  // The very first move of the game doesn't use the mover's time (their clock wasn't running).
  if (s.running === mover) next[mover] = Math.max(0, remaining(s, mover, now)) + s.increment
  return next
}

export function pause(s: ClockState, now: number): ClockState {
  if (!s.running) return s
  return { ...s, [s.running]: remaining(s, s.running, now), running: null }
}

export function resume(s: ClockState, side: Color, now: number): ClockState {
  return { ...s, running: side, since: now }
}

/** "4:59", "0:09.3" under 10 s, "1:02:00" over an hour */
export function formatClock(ms: number): string {
  const total = Math.max(0, ms)
  if (total < 10_000) return `0:0${(Math.floor(total / 100) / 10).toFixed(1)}`
  const s = Math.ceil(total / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

/** A ticking clock for a live game. Calls onFlag once when the running side hits zero. */
export function useClock(initial: ClockState | null, onFlag: (c: Color) => void) {
  const [state, setState] = useState<ClockState | null>(initial)
  const [now, setNow] = useState(() => performance.now())
  const flagRef = useRef(onFlag)
  useEffect(() => {
    flagRef.current = onFlag
  })

  const running = state?.running ?? null
  useEffect(() => {
    if (!state || !running) return
    const id = setInterval(() => {
      const t = performance.now()
      setNow(t)
      if (remaining(state, running, t) <= 0) {
        setState((s) => (s ? { ...pause(s, t), [running]: 0 } : s))
        flagRef.current(running)
      }
    }, 100)
    return () => clearInterval(id)
  }, [state, running])

  // Off screen (phone locked, another app): the clock pauses and picks up again on return,
  // so a family game is never lost on time while nobody is looking (user's choice, 2026-09-29).
  const away = useRef<{ side: Color | null } | null>(null)
  useEffect(() => {
    const onVisibility = () => {
      const t = performance.now()
      if (document.hidden) {
        setState((s) => {
          away.current = { side: s?.running ?? null }
          return s ? pause(s, t) : s
        })
      } else if (away.current) {
        const side = away.current.side
        away.current = null
        setNow(t)
        setState((s) => (s && side && !s.running ? resume(s, side, t) : s))
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const moved = useCallback(
    (mover: Color) =>
      setState((s) => {
        if (!s) return s
        const t = performance.now()
        const next = afterMove(s, mover, t)
        // a move while away (the bot's reply): its clock starts when the player is back
        if (away.current) {
          away.current = { side: next.running }
          return pause(next, t)
        }
        return next
      }),
    [],
  )
  const stop = useCallback(() => {
    if (away.current) away.current = { side: null }
    setState((s) => (s ? pause(s, performance.now()) : s))
  }, [])
  const reset = useCallback((s: ClockState | null) => {
    away.current = null
    setState(s)
    setNow(performance.now())
  }, [])

  const time = (c: Color) => (state ? remaining(state, c, running ? now : 0) : 0)
  return { state, time, moved, stop, reset, running }
}
