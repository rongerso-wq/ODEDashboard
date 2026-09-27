import { useEffect, useMemo, useState } from 'react'
import { Chess, type Color, type Move, type Square } from 'chess.js'
import Board, { type BoardArrow } from '../components/Board'
import { GradeBadge } from '../components/CoachCard'
import EvalGraph from '../components/EvalGraph'
import { VoiceToggle } from '../components/Elias'
import { useSay } from '../lib/useVoice'
import { IconBack, IconFirst, IconLast, IconNext, IconPrev } from '../components/Icons'
import { analyse, REVIEW, uciToSan, type Analysis } from '../coach/analysis'
import { explainMove, gradeTitle, type Feedback, type Voice } from '../coach/explain'
import { formatEval, moveAccuracy, type Grade } from '../coach/grade'
import { loadReviewGame, saveCurrentGame, type ReviewGame } from '../chess/saved'
import { Engine } from '../engine/engine'
import { navigate } from '../lib/router'
import { useSettings } from '../lib/settings'
import './Review.css'

const BAD: Grade[] = ['inaccuracy', 'mistake', 'blunder']

export default function Review() {
  const [game] = useState(loadReviewGame)
  useEffect(() => {
    if (!game) navigate('/')
  }, [game])
  return game ? <ReviewScreen game={game} /> : null
}

function replay(sans: string[]): { moves: Move[]; fens: string[] } {
  const c = new Chess()
  const moves: Move[] = []
  for (const s of sans) {
    try {
      moves.push(c.move(s))
    } catch {
      break
    }
  }
  return { moves, fens: [new Chess().fen(), ...moves.map((m) => m.after)] }
}

function ReviewScreen({ game }: { game: ReviewGame }) {
  const { mode, coordinates } = useSettings()
  const kids = mode === 'kids'
  const { moves, fens } = useMemo(() => replay(game.moves), [game.moves])
  const names: Record<Color, string> = { w: game.white, b: game.black }
  const [analyses, setAnalyses] = useState<(Analysis | null)[]>(() => fens.map(() => null))
  const [ply, setPly] = useState(0)
  const [showBest, setShowBest] = useState(false)

  // Analyse every position once, in order; the page fills in as results arrive.
  useEffect(() => {
    const engine = new Engine()
    let cancelled = false
    ;(async () => {
      for (let i = 0; i < fens.length && !cancelled; i++) {
        const a = await analyse(engine, fens[i], REVIEW).catch(() => null)
        if (cancelled) return
        setAnalyses((prev) => {
          const next = [...prev]
          next[i] = a
          return next
        })
      }
    })()
    return () => {
      cancelled = true
      engine.terminate()
    }
  }, [fens])

  const done = analyses.filter(Boolean).length
  const complete = done === fens.length

  // White's eval per position (analysis scores are for the side to move).
  const evals = analyses.map((a, i) => (a ? (i % 2 === 0 ? a.cp : -a.cp) : null))

  const voiceFor = (mover: Color): Voice =>
    game.me === null
      ? { kids, your: `${names[mover]}'s`, opp: names[mover === 'w' ? 'b' : 'w'] }
      : { kids, your: 'your', opp: names[mover === 'w' ? 'b' : 'w'] }

  const feedback: (Feedback | null)[] = useMemo(
    () =>
      moves.map((m, i) => {
        const before = analyses[i]
        const after = analyses[i + 1]
        return before && after ? explainMove({ move: m, ply: i, before, after, voice: voiceFor(m.color) }) : null
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [analyses, moves, kids],
  )
  const grades = feedback.map((f) => f?.grade)
  const isMine = (m: Move) => game.me === null || m.color === game.me

  // Per side: accuracy and counts.
  const summary = (['w', 'b'] as const).map((c) => {
    const mine = feedback.filter((f, i) => f && moves[i].color === c) as Feedback[]
    const acc = mine.length ? mine.reduce((s, f) => s + moveAccuracy(f.evalBefore, f.evalAfter), 0) / mine.length : null
    const count = (g: Grade) => mine.filter((f) => f.grade === g).length
    return { c, acc, best: count('best'), inaccuracy: count('inaccuracy'), mistake: count('mistake'), blunder: count('blunder') }
  })

  const keyMoments = feedback
    .map((f, i) => ({ f, i }))
    .filter(({ f, i }) => f && (f.grade === 'mistake' || f.grade === 'blunder') && isMine(moves[i]))

  // Keyboard: ← → to step through the game.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(ply - 1)
      if (e.key === 'ArrowRight') go(ply + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function go(p: number) {
    setPly(Math.max(0, Math.min(fens.length - 1, p)))
    setShowBest(false)
  }

  const move = ply > 0 ? moves[ply - 1] : null
  const fb = ply > 0 ? feedback[ply - 1] : null
  const nextMistake = keyMoments.find(({ i }) => i + 1 > ply)

  // "Show the better move": the position before the move, with the played (red) and best (green) arrows.
  const arrows: BoardArrow[] = []
  if (showBest && fb && move) {
    arrows.push({ from: move.from, to: move.to, tone: 'bad' })
    if (fb.bestUci) arrows.push({ from: fb.bestUci.slice(0, 2) as Square, to: fb.bestUci.slice(2, 4) as Square, tone: 'good' })
  }
  const boardFen = showBest && move ? move.before : fens[ply]

  function tryFromHere() {
    if (!game.config || !move) return
    saveCurrentGame({ config: { ...game.config, tc: null }, moves: game.moves.slice(0, ply - 1), clock: null })
    navigate('/play/computer/game')
  }

  const current = analyses[ply]
  const evalText = current ? formatEval(ply % 2 === 0 ? current.cp : -current.cp) : '…'
  const mover = move ? names[move.color] : ''
  const shownText =
    !move || !fb
      ? null
      : isMine(move)
        ? fb.text
        : BAD.includes(fb.grade)
          ? fb.bestSan
            ? `${fb.bestSan} was better.`
            : ''
          : `${mover} played well here.`

  // Elias: a summary once the analysis is done, then the verdict on each move you step to.
  const me = game.me ? summary.find((s) => s.c === game.me) : null
  const mistakesOfMine = me ? me.mistake + me.blunder : keyMoments.length
  useSay(
    complete && ply === 0
      ? `${game.result}. ${me?.acc != null ? `Your accuracy was ${Math.round(me.acc)} percent. ` : ''}${
          mistakesOfMine === 0
            ? 'No serious mistakes. Well played!'
            : `There ${mistakesOfMine === 1 ? 'was one moment' : `were ${mistakesOfMine} moments`} worth a closer look. Let us step through them together.`
        }`
      : null,
  )
  useSay(fb && move ? `${mover}, ${fb.san}. ${gradeTitle(fb.grade, kids)}. ${shownText}` : null, ply)

  return (
    <div className="page review">
      <header className="topbar">
        <div className="brand">
          <button className="icon-btn" onClick={() => navigate(game.config ? '/play/computer' : '/')} aria-label="Back">
            <IconBack />
          </button>
          <h1 className="screen-title">{kids ? 'How did I do?' : 'Game review'}</h1>
        </div>
        <VoiceToggle />
      </header>

      <div className="review-layout">
        <div className="review-board">
          <Board
            fen={boardFen}
            orientation={game.me ?? 'w'}
            lastMove={showBest || !move ? null : { from: move.from, to: move.to }}
            animate={false}
            coordinates={coordinates}
            arrows={arrows}
          />
          <div className="nav" role="group" aria-label="Move navigation">
            <button className="icon-btn" onClick={() => go(0)} disabled={ply === 0} aria-label="First move">
              <IconFirst />
            </button>
            <button className="icon-btn nav-big" onClick={() => go(ply - 1)} disabled={ply === 0} aria-label="Previous move">
              <IconPrev />
            </button>
            <span className="nav-pos">{ply === 0 ? 'Start' : `${Math.ceil(ply / 2)}${ply % 2 ? '.' : '…'} ${move?.san}`}</span>
            <button className="icon-btn nav-big" onClick={() => go(ply + 1)} disabled={ply === fens.length - 1} aria-label="Next move">
              <IconNext />
            </button>
            <button className="icon-btn" onClick={() => go(fens.length - 1)} disabled={ply === fens.length - 1} aria-label="Last move">
              <IconLast />
            </button>
          </div>
        </div>

        <aside className="review-side">
          <section className="review-summary">
            <p className="review-result">{game.result}</p>
            {!complete && (
              <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={fens.length} aria-valuenow={done}>
                <span style={{ width: `${(done / fens.length) * 100}%` }} />
                <em>
                  {kids ? 'The coach is looking at your game…' : 'Analysing'} {done}/{fens.length}
                </em>
              </div>
            )}
            <div className="accuracy">
              {summary.map((s) => (
                <div key={s.c} className={`acc-col${game.me === s.c ? ' me' : ''}`}>
                  <span className="acc-name">
                    <i className={`player-dot ${s.c}`} /> {names[s.c]}
                  </span>
                  <strong className="acc-num">{s.acc === null ? '–' : `${Math.round(s.acc)}%`}</strong>
                  <span className="acc-label">accuracy</span>
                  <span className="acc-counts">
                    <span className="c-best">★ {s.best}</span>
                    <span className="c-inaccuracy">?! {s.inaccuracy}</span>
                    <span className="c-mistake">? {s.mistake}</span>
                    <span className="c-blunder">?? {s.blunder}</span>
                  </span>
                </div>
              ))}
            </div>
            <EvalGraph evals={evals} grades={grades} current={ply} onPick={go} />
          </section>

          <section className="review-move" aria-live="polite">
            {!move ? (
              <p className="muted">
                {kids
                  ? 'Tap the arrows to walk through your game. The coach marks the good moves and the oops moments.'
                  : 'Step through the game with the arrows (or ← →). Tap the graph to jump to any moment.'}
              </p>
            ) : !fb ? (
              <p className="muted">Analysing this move…</p>
            ) : (
              <>
                <div className="rm-head">
                  <GradeBadge grade={fb.grade} size={40} />
                  <div>
                    <strong>
                      {mover}: {fb.san}
                    </strong>
                    <span className={`rm-grade g-${fb.grade}`}>{gradeTitle(fb.grade, kids)}</span>
                  </div>
                  {!kids && (
                    <span className="rm-eval" title="Evaluation (+ = White is better)">
                      {evalText}
                    </span>
                  )}
                </div>
                <p>{shownText}</p>
                <div className="rm-actions">
                  {BAD.includes(fb.grade) && fb.bestUci && (
                    <button className="btn" onClick={() => setShowBest(!showBest)}>
                      {showBest ? 'Back to the game' : `Show ${uciToSan(move.before, fb.bestUci) ?? 'the better move'}`}
                    </button>
                  )}
                  {BAD.includes(fb.grade) && isMine(move) && game.config && (
                    <button className="btn btn-primary" onClick={tryFromHere}>
                      Try again from here
                    </button>
                  )}
                </div>
              </>
            )}
            {nextMistake && (
              <button className="btn btn-ghost next-mistake" onClick={() => go(nextMistake.i + 1)}>
                Next {game.me ? 'mistake of yours' : 'mistake'} → move {Math.ceil((nextMistake.i + 1) / 2)}
              </button>
            )}
          </section>

          {complete && keyMoments.length > 0 && (
            <section className="key-moments">
              <h2>Key moments</h2>
              <ul>
                {keyMoments.map(({ f, i }) => (
                  <li key={i}>
                    <button className={ply === i + 1 ? 'on' : ''} onClick={() => go(i + 1)}>
                      <GradeBadge grade={f!.grade} size={26} />
                      <span>
                        {Math.ceil((i + 1) / 2)}
                        {i % 2 === 0 ? '.' : '…'} {f!.san}
                      </span>
                      <span className="km-text">{f!.text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {complete && keyMoments.length === 0 && (
            <p className="clean-game">{kids ? 'No big mistakes — amazing! ⭐' : 'No mistakes or blunders in this game. Well played.'}</p>
          )}
        </aside>
      </div>
    </div>
  )
}
