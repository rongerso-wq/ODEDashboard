import { useEffect, useRef, type ReactNode } from 'react'
import type { Color, Material, Move, Outcome } from '../chess/game'
import { formatClock } from '../chess/clock'
import type { Grade } from '../coach/grade'
import { colorName, other, outcomeText } from '../chess/game'
import { pieceUrl } from '../chess/pieces'
import { useBackToClose } from '../lib/router'
import './GamePanels.css'

export function PlayerStrip({
  color,
  name,
  toMove,
  material,
  over,
  avatar,
  thinking = false,
  clock,
  clockRunning = false,
}: {
  color: Color
  clockRunning?: boolean
  name: string
  toMove: boolean
  material: Material
  over: boolean
  avatar?: ReactNode
  thinking?: boolean
  /** remaining ms; omit for games without a clock */
  clock?: number
}) {
  const lead = color === 'w' ? material.diff : -material.diff
  const active = toMove && !over
  return (
    <div className={`player${active ? ' active' : ''}`}>
      {avatar ?? <span className={`player-dot ${color}`} aria-hidden="true" />}
      <span className="player-name">{name}</span>
      <span className="captured" role="img" aria-label={`${colorName(color)} has captured ${material.captured[color].length} pieces`}>
        {material.captured[color].map((t, i) => (
          <img key={i} src={pieceUrl({ type: t, color: other(color) })} alt="" />
        ))}
        {lead > 0 && <span className="lead">+{lead}</span>}
      </span>
      {thinking && active ? (
        <span className="thinking" role="img" aria-label="thinking">
          <i />
          <i />
          <i />
        </span>
      ) : (
        active && clock === undefined && <span className="to-move">to move</span>
      )}
      {clock !== undefined && (
        <span
          className={`clock${clockRunning ? ' running' : ''}${clock < 20_000 ? ' low' : ''}`}
          role="timer"
          aria-label={`${colorName(color)} clock`}
        >
          {formatClock(clock)}
        </span>
      )}
    </div>
  )
}

const SYMBOL: Record<Grade, string> = { best: '', good: '', inaccuracy: '?!', mistake: '?', blunder: '??' }

function San({ move, grade, current }: { move: Move; grade?: Grade; current: boolean }) {
  return (
    <span className={`san${current ? ' current' : ''}${grade ? ` g-${grade}` : ''}`}>
      {move.san}
      {grade && SYMBOL[grade] && <sup className="sym">{SYMBOL[grade]}</sup>}
      {grade === 'best' && <sup className="sym">★</sup>}
    </span>
  )
}

export function MoveList({ history, grades = [] }: { history: Move[]; grades?: (Grade | undefined)[] }) {
  const endRef = useRef<HTMLOListElement>(null)
  useEffect(() => {
    const el = endRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, left: el.scrollWidth, behavior: 'smooth' })
  }, [history.length])

  const rows: [Move, Move | undefined][] = []
  for (let i = 0; i < history.length; i += 2) rows.push([history[i], history[i + 1]])

  return (
    <ol className="moves" ref={endRef} aria-label="Moves">
      {rows.length === 0 && <li className="moves-empty">Moves will appear here.</li>}
      {rows.map(([w, b], i) => (
        <li key={i}>
          <span className="num">{i + 1}.</span>
          <San move={w} grade={grades[i * 2]} current={!b && i === rows.length - 1} />
          {b && <San move={b} grade={grades[i * 2 + 1]} current={i === rows.length - 1} />}
        </li>
      ))}
    </ol>
  )
}

export function GameOverDialog({
  outcome,
  kids,
  onAgain,
  onReview,
  onHome,
  heading,
  note,
  againLabel,
  onAnalyse,
}: {
  /** opens the post-game review */
  onAnalyse?: () => void
  outcome: Outcome
  kids: boolean
  onAgain: () => void
  onReview: () => void
  onHome: () => void
  /** replaces the neutral title, e.g. "You won!" */
  heading?: string
  note?: ReactNode
  againLabel?: string
}) {
  const text = outcomeText(outcome, kids)
  const title = heading ?? text.title
  const detail = text.detail
  const againRef = useRef<HTMLButtonElement>(null)
  useEffect(() => againRef.current?.focus(), [])
  useBackToClose(true, onReview) // Android Back closes the card and shows the board
  return (
    <div className="dialog-backdrop" role="presentation" onClick={onReview}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="go-title" onClick={(e) => e.stopPropagation()}>
        <div className={`result-badge ${outcome.winner ?? 'draw'}`} aria-hidden="true">
          {outcome.winner ? <img src={pieceUrl({ type: 'k', color: outcome.winner })} alt="" /> : '½'}
        </div>
        <h2 id="go-title">{title}</h2>
        <p>{detail}</p>
        {note}
        <div className="dialog-actions">
          <button ref={againRef} className="btn btn-primary" onClick={onAgain}>
            {againLabel ?? (kids ? 'Play again!' : 'Play again')}
          </button>
          {onAnalyse && (
            <button className="btn review-btn" onClick={onAnalyse}>
              {kids ? 'See how I did' : 'Review with coach'}
            </button>
          )}
          <button className="btn" onClick={onReview}>
            See the board
          </button>
          <button className="btn btn-ghost" onClick={onHome}>
            Home
          </button>
        </div>
      </div>
    </div>
  )
}
