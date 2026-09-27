import { useEffect, useMemo, useState } from 'react'
import Board from '../components/Board'
import { IconArrow, IconBack } from '../components/Icons'
import { pieceUrl } from '../chess/pieces'
import { dailyPuzzle, loadPuzzles, loadStats, themeSet, THEMES, today, type Puzzle } from '../puzzles/model'
import { navigate } from '../lib/router'
import { useSettings } from '../lib/settings'
import './Puzzles.css'

export default function PuzzlesHome() {
  const { mode } = useSettings()
  const kids = mode === 'kids'
  const [all, setAll] = useState<Puzzle[] | null>(null)
  const stats = useMemo(() => loadStats(), [])
  useEffect(() => {
    void loadPuzzles().then(setAll)
  }, [])

  const daily = all ? dailyPuzzle(all) : null
  const dailyDone = stats.daily?.date === today() && stats.daily.solved
  const solved = new Set(stats.solved)
  const spark = stats.history.slice(-30)

  return (
    <div className="page puzzles">
      <header className="topbar">
        <div className="brand">
          <button className="icon-btn" onClick={() => navigate('/')} aria-label="Back to home">
            <IconBack />
          </button>
          <h1 className="screen-title">Puzzles</h1>
        </div>
        <div className="p-streak" title="Days in a row with a solved puzzle">
          🔥 {stats.streak.days} <span>{stats.streak.days === 1 ? 'day' : 'days'}</span>
        </div>
      </header>

      <div className="p-top">
        <button className="p-card p-daily" onClick={() => navigate('/puzzles/daily')} disabled={!daily}>
          <span className="p-eyebrow">{kids ? "Today's puzzle" : 'Puzzle of the day'}</span>
          <div className="p-daily-board" aria-hidden="true">
            {daily && <Board fen={daily.fen} orientation={daily.fen.split(' ')[1] === 'w' ? 'b' : 'w'} coordinates={false} animate={false} />}
          </div>
          <span className="p-cta">
            {dailyDone ? '✓ Solved today' : kids ? 'Solve it!' : 'Solve'} <IconArrow />
          </span>
        </button>

        <div className="p-col">
          <button className="p-card p-rated" onClick={() => navigate('/puzzles/rated')}>
            <span className="p-eyebrow">{kids ? 'Puzzle training' : 'Rated puzzles'}</span>
            <strong className="p-big">{stats.rating}</strong>
            <span className="p-sub">
              {kids ? 'Your puzzle score — solve puzzles to grow it!' : 'Your puzzle rating. Puzzles adapt to your level.'}
            </span>
            {spark.length > 1 && <Sparkline values={spark.map((h) => h.rating)} />}
            <span className="p-cta">
              {kids ? 'Train' : 'Train'} <IconArrow />
            </span>
          </button>

          <button className="p-card p-rush" onClick={() => navigate('/puzzles/rush')}>
            <span className="p-eyebrow">Puzzle Rush</span>
            <strong className="p-big">⚡ {stats.rushBest}</strong>
            <span className="p-sub">{kids ? 'Solve as many as you can in 3 minutes!' : '3 minutes, 3 lives. Your best score.'}</span>
            <span className="p-cta">
              Play <IconArrow />
            </span>
          </button>
        </div>
      </div>

      <section className="p-themes">
        <h2>{kids ? 'Pick a kind of puzzle' : 'Train by theme'}</h2>
        <div className="p-theme-grid">
          {THEMES.map((t) => {
            const set = all ? themeSet(all, t.id) : []
            const done = set.filter((p) => solved.has(p.id)).length
            return (
              <button key={t.id} className="p-theme" onClick={() => navigate(`/puzzles/theme/${t.id}`)}>
                <span className="p-theme-icon">
                  <img src={pieceUrl({ type: t.piece, color: 'w' })} alt="" />
                </span>
                <span className="p-theme-body">
                  <strong>{kids ? t.kids : t.title}</strong>
                  <span>{t.about}</span>
                  <span className="p-theme-bar" aria-label={`${done} of ${set.length} solved`}>
                    <i style={{ width: set.length ? `${(done / set.length) * 100}%` : 0 }} />
                  </span>
                </span>
                <span className="p-theme-count">
                  {done}/{set.length || '…'}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <p className="p-credit">
        Puzzles from the{' '}
        <a href="https://database.lichess.org/#puzzles" target="_blank" rel="noreferrer">
          Lichess puzzle database
        </a>{' '}
        (public domain). {stats.solved.length} solved so far.
      </p>
    </div>
  )
}

function Sparkline({ values }: { values: number[] }) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(20, max - min)
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * 100).toFixed(1)},${(28 - ((v - min) / span) * 24).toFixed(1)}`)
  return (
    <svg className="p-spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts.join(' ')} />
    </svg>
  )
}
