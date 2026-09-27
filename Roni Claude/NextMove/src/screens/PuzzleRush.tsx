import { useEffect, useRef, useState } from 'react'
import { IconArrow, IconBack } from '../components/Icons'
import PuzzleBoard from '../components/PuzzleBoard'
import { loadPuzzles, loadStats, recordResult, rushPuzzle, saveStats, type Puzzle } from '../puzzles/model'
import { navigate } from '../lib/router'
import { useSettings } from '../lib/settings'
import { play } from '../lib/sound'
import './Puzzles.css'

const DURATION = 180_000
const LIVES = 3

type Phase = 'intro' | 'run' | 'over'

/** Puzzle Rush: 3 minutes, 3 lives, puzzles get harder as you go. */
export default function PuzzleRush() {
  const { mode, coordinates } = useSettings()
  const kids = mode === 'kids'
  const [all, setAll] = useState<Puzzle[] | null>(null)
  const [phase, setPhase] = useState<Phase>('intro')
  const [results, setResults] = useState<boolean[]>([])
  const [current, setCurrent] = useState<Puzzle | null>(null)
  const [endsAt, setEndsAt] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [best, setBest] = useState(() => loadStats().rushBest)
  const [record, setRecord] = useState(false)
  const used = useRef(new Set<string>())
  const solvedRef = useRef(0) // difficulty follows the number solved
  const phaseRef = useRef<Phase>('intro')
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    void loadPuzzles().then(setAll)
  }, [])

  const score = results.filter(Boolean).length
  const strikes = results.filter((r) => !r).length
  const left = Math.max(0, endsAt - now)

  // Clock.
  useEffect(() => {
    if (phase !== 'run') return
    const id = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(id)
  }, [phase])

  // Out of time or out of lives.
  useEffect(() => {
    if (phase === 'run' && (left <= 0 || strikes >= LIVES)) end()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, left, strikes])

  function start() {
    if (!all) return
    used.current = new Set()
    solvedRef.current = 0
    const first = rushPuzzle(all, 0, used.current)
    used.current.add(first.id)
    setResults([])
    setCurrent(first)
    setRecord(false)
    setEndsAt(Date.now() + DURATION)
    setNow(Date.now())
    setPhase('run')
  }

  function end() {
    setPhase('over')
    play('end')
    const s = loadStats()
    if (score > s.rushBest) {
      saveStats({ ...s, rushBest: score })
      setBest(score)
      setRecord(true)
    }
  }

  function onResult(ok: boolean) {
    if (current) recordResult(current, ok, false)
    if (ok) solvedRef.current++
    setResults((r) => [...r, ok])
  }

  function onFinish() {
    // short pause so the last move is visible, then the next (harder) puzzle
    setTimeout(() => {
      if (!all || phaseRef.current !== 'run') return
      const nextP = rushPuzzle(all, solvedRef.current, used.current)
      used.current.add(nextP.id)
      setCurrent(nextP)
    }, 500)
  }

  const mm = Math.floor(left / 60000)
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0')

  return (
    <div className="page game rush">
      <header className="topbar">
        <div className="brand">
          <button className="icon-btn" onClick={() => navigate('/puzzles')} aria-label="Back to puzzles">
            <IconBack />
          </button>
          <h1 className="screen-title">Puzzle Rush</h1>
        </div>
      </header>

      {phase === 'intro' && (
        <section className="rush-card">
          <div className="rush-bolt" aria-hidden="true">
            ⚡
          </div>
          <h2>{kids ? 'How many can you solve?' : 'Solve as many as you can'}</h2>
          <ul className="rush-rules">
            <li>⏱️ 3 minutes</li>
            <li>❤️ 3 lives — a wrong move costs one</li>
            <li>📈 {kids ? 'Puzzles get harder as you go' : 'Puzzles get harder with every solve'}</li>
          </ul>
          <p className="p-sub">Your best: {best}</p>
          <button className="btn btn-primary rush-go" onClick={start} disabled={!all}>
            {all ? (kids ? 'Go!' : 'Start') : 'Loading…'} <IconArrow />
          </button>
        </section>
      )}

      {phase === 'run' && current && (
        <div className="game-layout">
          <div className="board-col">
            <div className="rush-bar">
              <span className={`rush-time${left < 20_000 ? ' low' : ''}`}>
                {mm}:{ss}
              </span>
              <span className="rush-lives" role="img" aria-label={`${LIVES - strikes} lives left`}>
                {Array.from({ length: LIVES }, (_, i) => (
                  <i key={i} className={i < LIVES - strikes ? 'on' : ''}>
                    ♥
                  </i>
                ))}
              </span>
              <span className="rush-score">⚡ {score}</span>
            </div>
            <div className="rush-timeline" aria-hidden="true">
              <i style={{ width: `${(left / DURATION) * 100}%` }} />
            </div>
            <PuzzleBoard
              key={current.id}
              puzzle={current}
              coordinates={coordinates}
              kids={kids}
              strict
              onFirstResult={onResult}
              onFinish={onFinish}
            />
          </div>
          <aside className="side p-side">
            <div className="p-status">
              <span className={`p-turn ${current.fen.split(' ')[1] === 'w' ? 'b' : 'w'}`} aria-hidden="true" />
              <div>
                <strong>{current.fen.split(' ')[1] === 'w' ? 'Black' : 'White'} to move</strong>
                <p>Puzzle {results.length + 1} · rating {current.rating}</p>
              </div>
            </div>
            <div className="rush-trail" role="img" aria-label="Results so far">
              {results.map((r, i) => (
                <span key={i} className={r ? 'ok' : 'bad'}>
                  {r ? '✓' : '✗'}
                </span>
              ))}
            </div>
          </aside>
        </div>
      )}

      {phase === 'over' && (
        <section className="rush-card">
          <div className="rush-bolt" aria-hidden="true">
            {record ? '🏆' : '⚡'}
          </div>
          <h2>{record ? (kids ? 'New record! 🎉' : 'New personal best!') : kids ? 'Great run!' : 'Run over'}</h2>
          <strong className="rush-final">{score}</strong>
          <p className="p-sub">
            {score === 1 ? 'puzzle' : 'puzzles'} solved · best {best}
          </p>
          <div className="rush-trail center">
            {results.map((r, i) => (
              <span key={i} className={r ? 'ok' : 'bad'}>
                {r ? '✓' : '✗'}
              </span>
            ))}
          </div>
          <button className="btn btn-primary rush-go" onClick={start}>
            {kids ? 'Play again!' : 'Play again'} <IconArrow />
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/puzzles')}>
            Back to puzzles
          </button>
        </section>
      )}
    </div>
  )
}
