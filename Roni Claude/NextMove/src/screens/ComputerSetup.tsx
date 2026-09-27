import { useMemo, useState } from 'react'
import { BotAvatar } from '../components/BotAvatar'
import { IconArrow, IconBack } from '../components/Icons'
import { BOTS, botById } from '../engine/bots'
import { newClock, TIME_CONTROLS, timeControlById } from '../chess/clock'
import { pieceUrl } from '../chess/pieces'
import {
  beatenBots,
  loadCurrentGame,
  loadHistory,
  saveCurrentGame,
  saveReviewGame,
  type ComputerConfig,
  type FinishedGame,
} from '../chess/saved'
import { Chess } from 'chess.js'
import { navigate } from '../lib/router'
import { useSettings } from '../lib/settings'
import { load, save } from '../lib/storage'
import type { Color } from '../chess/game'
import './ComputerSetup.css'

type Choice = Color | 'random'

const RESULT_LABEL = { win: 'Won', loss: 'Lost', draw: 'Draw' } as const

export default function ComputerSetup() {
  const { mode } = useSettings()
  const kids = mode === 'kids'
  const last = load<Partial<ComputerConfig>>('computer-last', {})
  const [botId, setBotId] = useState(last.botId ?? 'pip')
  const [choice, setChoice] = useState<Choice>(last.choice ?? 'w')
  const [tc, setTc] = useState<string | null>(last.tc ?? null)
  const [current, setCurrent] = useState(loadCurrentGame)
  const beaten = useMemo(() => beatenBots(), [])
  const history = useMemo(() => loadHistory().slice(0, 6), [])
  const bot = botById(botId)

  function reviewGame(g: FinishedGame) {
    const c = new Chess()
    try {
      c.loadPgn(g.pgn)
    } catch {
      return
    }
    const b = botById(g.botId)
    saveReviewGame({
      moves: c.history(),
      white: g.color === 'w' ? 'You' : b.name,
      black: g.color === 'b' ? 'You' : b.name,
      me: g.color,
      result: g.result === 'win' ? 'You won' : g.result === 'loss' ? `${b.name} won` : 'Draw',
      config: { botId: g.botId, choice: g.color, color: g.color, tc: null },
    })
    navigate('/review')
  }

  function start() {
    const color: Color = choice === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : choice
    const config: ComputerConfig = { botId, choice, color, tc }
    const time = timeControlById(tc)
    save('computer-last', { botId, choice, tc })
    saveCurrentGame({ config, moves: [], clock: time ? newClock(time) : null })
    navigate('/play/computer/game')
  }

  return (
    <div className="page setup">
      <header className="topbar">
        <div className="brand">
          <button className="icon-btn" onClick={() => navigate('/')} aria-label="Back to home">
            <IconBack />
          </button>
          <h1 className="screen-title">Play the Computer</h1>
        </div>
      </header>

      {current && current.moves.length > 0 && (
        <section className="resume" aria-label="Unfinished game">
          <BotAvatar bot={botById(current.config.botId)} size={52} />
          <div className="resume-text">
            <strong>Unfinished game vs {botById(current.config.botId).name}</strong>
            <span>
              Move {Math.ceil(current.moves.length / 2)} · you play {current.config.color === 'w' ? 'White' : 'Black'}
            </span>
          </div>
          <div className="resume-actions">
            <button className="btn btn-primary" onClick={() => navigate('/play/computer/game')}>
              Continue
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                saveCurrentGame(null)
                setCurrent(null)
              }}
            >
              Discard
            </button>
          </div>
        </section>
      )}

      <section className="setup-section">
        <h2>{kids ? 'Who do you want to play?' : 'Choose your opponent'}</h2>
        <div className="bots" role="radiogroup" aria-label="Opponent">
          {BOTS.map((b) => (
            <button
              key={b.id}
              role="radio"
              aria-checked={b.id === botId}
              className={`bot${b.id === botId ? ' selected' : ''}`}
              onClick={() => setBotId(b.id)}
            >
              <BotAvatar bot={b} size={56} />
              <span className="bot-name">{b.name}</span>
              <span className="bot-level">
                <span className="pips" aria-label={`Level ${b.level} of 8`}>
                  {Array.from({ length: 8 }, (_, i) => (
                    <i key={i} className={i < b.level ? 'on' : ''} />
                  ))}
                </span>
                {/\d/.test(b.strength) ? `≈ ${b.strength}` : b.strength}
              </span>
              {beaten.has(b.id) && <span className="beaten">✓ Beaten</span>}
            </button>
          ))}
        </div>
        <p className="bot-blurb">
          <strong>{bot.name}.</strong> {kids ? bot.kids : bot.classic}
        </p>
      </section>

      <section className="setup-section">
        <h2>{kids ? 'Pick your color' : 'Play as'}</h2>
        <div className="colors" role="radiogroup" aria-label="Your color">
          {(['w', 'random', 'b'] as const).map((c) => (
            <button
              key={c}
              role="radio"
              aria-checked={choice === c}
              className={`color-opt${choice === c ? ' selected' : ''}`}
              onClick={() => setChoice(c)}
            >
              {c === 'random' ? (
                <span className="half-king" aria-hidden="true">
                  <img src={pieceUrl({ type: 'k', color: 'w' })} alt="" />
                  <img src={pieceUrl({ type: 'k', color: 'b' })} alt="" />
                </span>
              ) : (
                <img src={pieceUrl({ type: 'k', color: c })} alt="" />
              )}
              <span>{c === 'w' ? 'White' : c === 'b' ? 'Black' : 'Random'}</span>
            </button>
          ))}
        </div>
        <p className="hint">{kids ? 'White always moves first.' : 'White moves first.'}</p>
      </section>

      <section className="setup-section">
        <h2>Clock</h2>
        <div className="tcs" role="radiogroup" aria-label="Time control">
          <button role="radio" aria-checked={tc === null} className={`tc${tc === null ? ' selected' : ''}`} onClick={() => setTc(null)}>
            <strong>No clock</strong>
            <span>Take-backs allowed</span>
          </button>
          {TIME_CONTROLS.map((t) => (
            <button key={t.id} role="radio" aria-checked={tc === t.id} className={`tc${tc === t.id ? ' selected' : ''}`} onClick={() => setTc(t.id)}>
              <strong>{t.label}</strong>
              <span>{t.kind}</span>
            </button>
          ))}
        </div>
        <p className="hint">
          {tc === null
            ? kids
              ? 'No hurry — think as long as you like.'
              : 'Relaxed play: think as long as you like and take back moves.'
            : `${timeControlById(tc)!.minutes} min each${timeControlById(tc)!.increment ? `, +${timeControlById(tc)!.increment} s per move` : ''}. No take-backs.`}
        </p>
      </section>

      {history.length > 0 && (
        <section className="setup-section">
          <h2>Recent games</h2>
          <ul className="recent">
            {history.map((g) => {
              const b = botById(g.botId)
              return (
                <li key={g.at}>
                  <button onClick={() => reviewGame(g)} aria-label={`Review your game against ${b.name}`}>
                    <BotAvatar bot={b} size={32} />
                    <span className="recent-name">{b.name}</span>
                    <span className="recent-meta">
                      {g.color === 'w' ? 'White' : 'Black'} · {Math.ceil(g.moves / 2)} moves
                    </span>
                    <span className={`recent-result ${g.result}`}>{RESULT_LABEL[g.result]}</span>
                    <span className="recent-review">Review</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <div className="play-bar">
        <button className="btn btn-primary play-btn" onClick={start}>
          <BotAvatar bot={bot} size={34} />
          {kids ? `Play with ${bot.name}!` : `Play ${bot.name}`}
          <IconArrow />
        </button>
      </div>
    </div>
  )
}
