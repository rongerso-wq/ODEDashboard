import { useEffect, useMemo, useState } from 'react'
import { IconArrow, IconBack, IconBulb } from '../components/Icons'
import PuzzleBoard, { type PuzzleStatus } from '../components/PuzzleBoard'
import { VoiceToggle } from '../components/Elias'
import { useSay } from '../lib/useVoice'
import {
  dailyPuzzle,
  loadPuzzles,
  loadStats,
  nextRated,
  recordResult,
  saveStats,
  themeById,
  themeSet,
  THEMES,
  today,
  type Puzzle,
  type PuzzleMode as Mode,
} from '../puzzles/model'
import { navigate } from '../lib/router'
import { useSettings } from '../lib/settings'
import './Puzzles.css'


const themeTitle = (id: string, kids: boolean) => {
  const t = themeById(id)
  return t ? (kids ? t.kids : t.title) : null
}

export default function PuzzlePlay({ mode }: { mode: Mode }) {
  const { mode: style, coordinates } = useSettings()
  const kids = style === 'kids'
  const [all, setAll] = useState<Puzzle[] | null>(null)
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)
  const [round, setRound] = useState(0)
  const [status, setStatus] = useState<PuzzleStatus>('starting')
  const [message, setMessage] = useState<string | null>(null)
  const [firstTry, setFirstTry] = useState<boolean | null>(null)
  const [delta, setDelta] = useState<number | null>(null)
  const [rating, setRating] = useState(() => loadStats().rating)
  const [hintReq, setHintReq] = useState(0)
  const [solutionReq, setSolutionReq] = useState(0)

  const pick = useMemo(
    () => (list: Puzzle[]): Puzzle => {
      const stats = loadStats()
      if (mode.kind === 'rated') return nextRated(list, stats)
      if (mode.kind === 'daily') return dailyPuzzle(list)
      const set = themeSet(list, mode.theme)
      const solved = new Set(stats.solved)
      return set.find((p) => !solved.has(p.id)) ?? set[Math.floor(Math.random() * set.length)]
    },
    [mode],
  )

  useEffect(() => {
    void loadPuzzles().then((list) => {
      setAll(list)
      setPuzzle(pick(list))
    })
  }, [pick])

  function next() {
    if (!all) return
    setPuzzle(pick(all))
    setRound((r) => r + 1)
    setStatus('starting')
    setMessage(null)
    setFirstTry(null)
    setDelta(null)
    setHintReq(0)
    setSolutionReq(0)
  }

  function onFirstResult(ok: boolean) {
    if (!puzzle) return
    setFirstTry(ok)
    const { stats, delta } = recordResult(puzzle, ok, mode.kind === 'rated')
    if (mode.kind === 'rated') {
      setDelta(delta)
      setRating(stats.rating)
    }
    if (mode.kind === 'daily' && stats.daily?.date !== today()) saveStats({ ...stats, daily: { date: today(), solved: ok } })
  }

  const finished = status === 'solved' || status === 'failed'
  const title =
    mode.kind === 'rated' ? (kids ? 'Puzzle training' : 'Rated puzzles') : mode.kind === 'daily' ? (kids ? "Today's puzzle" : 'Puzzle of the day') : themeTitle(mode.theme, kids)
  const color = puzzle ? (puzzle.fen.split(' ')[1] === 'w' ? 'Black' : 'White') : ''
  const set = all && mode.kind === 'theme' ? themeSet(all, mode.theme) : null
  const solvedCount = set ? set.filter((p) => loadStats().solved.includes(p.id)).length : 0

  // Elias reads the task when the puzzle starts, then each reaction.
  const prompt = kids ? `You are ${color}. Find the best move!` : `${color} to move. Find the best move.`
  useSay(status === 'starting' ? null : status === 'play' && !message ? prompt : message, round)

  return (
    <div className="page game puzzle-play">
      <header className="topbar">
        <div className="brand">
          <button className="icon-btn" onClick={() => navigate('/puzzles')} aria-label="Back to puzzles">
            <IconBack />
          </button>
          <h1 className="screen-title">{title}</h1>
        </div>
        <div className="topbar-actions">
          {mode.kind === 'rated' && (
            <div className="p-rating-chip" aria-live="polite">
              {rating}
              {delta !== null && delta !== 0 && <span className={delta > 0 ? 'up' : 'down'}>{delta > 0 ? `+${delta}` : delta}</span>}
            </div>
          )}
          <VoiceToggle />
        </div>
      </header>

      <div className="game-layout">
        <div className="board-col">
          {puzzle ? (
            <PuzzleBoard
              key={`${puzzle.id}-${round}`}
              puzzle={puzzle}
              coordinates={coordinates}
              kids={kids}
              onFirstResult={onFirstResult}
              onStatus={(s, msg) => {
                setStatus(s)
                setMessage(msg)
              }}
              hintRequest={hintReq}
              solutionRequest={solutionReq}
            />
          ) : (
            <div className="p-loading">Loading puzzles…</div>
          )}
        </div>

        <aside className="side p-side">
          <div className={`p-status s-${status}`} role="status" aria-live="polite">
            <span className={`p-turn ${color === 'White' ? 'w' : 'b'}`} aria-hidden="true" />
            <div>
              <strong>
                {status === 'solved'
                  ? kids
                    ? 'Solved! ⭐'
                    : 'Solved'
                  : status === 'failed'
                    ? kids
                      ? 'Good try!'
                      : 'Puzzle over'
                    : kids
                      ? `You are ${color}. Find the best move!`
                      : `Find the best move for ${color}`}
              </strong>
              {message && <p>{message}</p>}
            </div>
          </div>

          {set && (
            <div className="p-progress" role="img" aria-label={`${solvedCount} of ${set.length} solved`}>
              <span>
                {solvedCount} / {set.length} solved
              </span>
              <i style={{ width: `${(solvedCount / set.length) * 100}%` }} />
            </div>
          )}

          <div className="p-actions">
            {finished ? (
              <button className="btn btn-primary" onClick={next}>
                {mode.kind === 'daily' ? 'More puzzles' : kids ? 'Next puzzle!' : 'Next puzzle'} <IconArrow />
              </button>
            ) : (
              <>
                <button className="btn hint-btn" onClick={() => setHintReq((h) => h + 1)} disabled={status !== 'play'}>
                  <IconBulb /> {hintReq === 0 ? (kids ? 'Help me' : 'Hint') : 'Show the move'}
                </button>
                <button className="btn btn-ghost" onClick={() => setSolutionReq((s) => s + 1)} disabled={status === 'starting' || solutionReq > 0}>
                  {kids ? 'Show me the answer' : 'Show solution'}
                </button>
              </>
            )}
          </div>

          {firstTry !== null && mode.kind === 'rated' && (
            <p className="p-note">
              {firstTry
                ? kids
                  ? 'First try — your score went up!'
                  : 'Solved at the first try.'
                : kids
                  ? 'Hints or a wrong move count as a miss — the next one will be a little easier.'
                  : 'A wrong move or a hint counts as a miss for your rating.'}
            </p>
          )}

          {finished && puzzle && (
            <div className="p-info">
              <span>
                Puzzle rating <strong>{puzzle.rating}</strong>
              </span>
              <div className="p-chips">
                {puzzle.themes
                  .map((t) => THEMES.find((x) => x.id === t))
                  .filter(Boolean)
                  .map((t) => (
                    <button key={t!.id} className="p-chip" onClick={() => navigate(`/puzzles/theme/${t!.id}`)}>
                      {kids ? t!.kids : t!.title}
                    </button>
                  ))}
              </div>
              <a href={`https://lichess.org/training/${puzzle.id}`} target="_blank" rel="noreferrer">
                Puzzle #{puzzle.id} on Lichess
              </a>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
