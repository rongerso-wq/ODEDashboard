import { useEffect, useMemo, useRef, useState } from 'react'
import { Chess, type Square } from 'chess.js'
import Board, { type BoardArrow, type BoardMark, type BoardMove } from '../components/Board'
import { Narrator, VoiceToggle } from '../components/Elias'
import { IconArrow, IconBack, IconBulb } from '../components/Icons'
import { checkedKing, legalDests } from '../chess/game'
import { hintFor } from '../coach/explain'
import { sayHint, sayPractice } from '../coach/say'
import { isMate, MATE_CP, scoreToCp } from '../coach/grade'
import { Engine } from '../engine/engine'
import { deckStats, dueCards, loadDeck, MASTERED, review, type MistakeCard } from '../mistakes/deck'
import { goBack, navigate } from '../lib/router'
import { useSettings } from '../lib/settings'
import { play } from '../lib/sound'
import './Mistakes.css'

const DAY = 86_400_000

/** Practice session over the cards that are due now. Missed cards come back at the end. */
export default function MistakesPractice() {
  const { mode, coordinates } = useSettings()
  const kids = mode === 'kids'
  // At most 20 cards a session: after a long break every due card at once could be 200.
  const [queue, setQueue] = useState<MistakeCard[]>(() => dueCards().slice(0, 20))
  const [idx, setIdx] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const [openedAt] = useState(() => Date.now()) // for "next review in N days"
  const stats = useMemo(() => deckStats(), [idx]) // eslint-disable-line react-hooks/exhaustive-deps
  const card = queue[idx]

  function onResult(c: MistakeCard, solved: boolean) {
    const updated = review(c, solved)
    setResults((r) => [...r, solved])
    // a missed card is practised again before the session ends: its updated copy (back in box 0),
    // or a solved retry would count from its old box and could jump straight to "mastered"
    if (!solved) setQueue((q) => [...q, updated])
  }

  const header = (
    <header className="topbar">
      <div className="brand">
        <button className="icon-btn" onClick={() => goBack('/')} aria-label="Back to home">
          <IconBack />
        </button>
        <h1 className="screen-title">{kids ? 'My oops moments' : 'My mistakes'}</h1>
      </div>
      <VoiceToggle />
    </header>
  )

  // Nothing to practise (yet).
  if (!card) {
    const deck = loadDeck()
    const next = deck.filter((c) => c.box < MASTERED).sort((a, b) => a.due - b.due)[0]
    const days = next ? Math.max(1, Math.round((next.due - openedAt) / DAY)) : 0
    const solvedNow = results.filter(Boolean).length
    const text =
      deck.length === 0
        ? kids
          ? "You don't have any oops moments yet! When you make a mistake in a game against the computer, I'll save it here so we can practise it together."
          : 'No mistakes saved yet. Every mistake or blunder the coach spots in your games against the computer lands here, and comes back until you have it right.'
        : results.length
          ? kids
            ? `All done! You fixed ${solvedNow} of ${results.length} at the first try. See you ${days === 1 ? 'tomorrow' : `in ${days} days`}!`
            : `Session complete: ${solvedNow} of ${results.length} solved at the first try. Next review ${days === 1 ? 'tomorrow' : `in ${days} days`}.`
          : kids
            ? `Nothing to practise right now. Come back ${days === 1 ? 'tomorrow' : `in ${days} days`}!`
            : `All caught up. Next review ${days === 1 ? 'tomorrow' : `in ${days} days`}.`
    // Elias says the recorded version (numbers of solved cards are only shown)
    const spoken =
      deck.length === 0
        ? text
        : results.length
          ? `${sayPractice.session(solvedNow === results.length)} ${sayPractice.when(days)}`
          : `${sayPractice.nothingDue} ${sayPractice.when(days)}`
    return (
      <div className="page mistakes">
        {header}
        <section className="mk-empty">
          <Narrator text={text} speakText={spoken} />
          <div className="mk-stats">
            <span>
              <strong>{stats.learning}</strong> learning
            </span>
            <span>
              <strong>{stats.mastered}</strong> mastered
            </span>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/play/computer')}>
            {kids ? 'Play a game' : 'Play the computer'} <IconArrow />
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className="page game mistakes">
      {header}
      <div className="mk-progress" role="img" aria-label={`Card ${idx + 1} of ${queue.length}`}>
        {queue.map((_, i) => (
          <span key={i} className={i < idx ? (results[i] ? 'ok' : 'bad') : i === idx ? 'now' : ''} />
        ))}
      </div>
      <CardSolver
        key={`${card.id}-${idx}`}
        card={card}
        kids={kids}
        coordinates={coordinates}
        onResult={(solved) => onResult(card, solved)}
        onNext={() => setIdx(idx + 1)}
      />
    </div>
  )
}

type State = 'play' | 'checking' | 'right' | 'shown'

function CardSolver({
  card,
  kids,
  coordinates,
  onResult,
  onNext,
}: {
  card: MistakeCard
  kids: boolean
  coordinates: boolean
  onResult: (solvedFirstTry: boolean) => void
  onNext: () => void
}) {
  const [chess] = useState(() => new Chess(card.fen))
  const me = useMemo(() => new Chess(card.fen).turn(), [card.fen])
  const [state, setState] = useState<State>('play')
  const [misses, setMisses] = useState(0)
  const [hint, setHint] = useState(0)
  // what the card shows, and what Elias says (fixed sentences from coach/say.ts, recorded)
  const [say, setSay] = useState<{ text: string; speak: string } | null>(null)
  const [last, setLast] = useState<{ from: Square; to: Square } | null>(null)
  const reported = useRef(false)
  const engineRef = useRef<Engine | null>(null)
  useEffect(() => () => engineRef.current?.terminate(), [])

  // The rules-based reason why the best move is good (same wording as the coach's hints).
  const analysis = { fen: card.fen, cp: card.evalBest, best: card.best, pv: [card.best], depth: 0 }
  const idea = hintFor(analysis, 1, 10, kids)?.text
  const hint3 = hintFor(analysis, 3, 10, kids)
  const reason = (hint3?.text ?? '').replace(/^Play [^.]+\.\s*/, '')
  const reasonSay = (hint3?.say ?? '').replace(`${sayHint.play} `, '')

  const report = (ok: boolean) => {
    if (reported.current) return
    reported.current = true
    onResult(ok)
  }

  const intro = kids
    ? `Remember your game against ${card.opponent}? You played ${card.played} here. Oops! Can you find a better move?`
    : `In your game against ${card.opponent} you played ${card.played} here, a ${card.grade}. Find the better move.`

  function solved(alternative: boolean, san: string) {
    setState('right')
    play('correct')
    report(misses === 0 && hint === 0)
    setSay({
      text: alternative
        ? kids
          ? `That works too! I was thinking of ${card.bestSan}. ${reason}`
          : `${san} works as well. I had ${card.bestSan} in mind: ${reason}`
        : `${kids ? 'Yes! ' : 'Correct: '}${card.bestSan}. ${reason}`,
      speak: `${alternative ? sayPractice.alsoWorks(kids) : sayPractice.right(kids)} ${reasonSay}`,
    })
  }

  function miss() {
    play('error')
    const n = misses + 1
    setMisses(n)
    if (n >= 2) showAnswer()
    else {
      const t = kids ? 'Not quite. Try again!' : 'Not quite. Look again.'
      setSay({ text: t, speak: t })
    }
  }

  function showAnswer() {
    report(false)
    setState('shown')
    setSay({ text: `${kids ? 'The move was' : 'The answer is'} ${card.bestSan}. ${reason}`, speak: `${sayPractice.shown(kids)} ${reasonSay}` })
  }

  async function onMove(m: BoardMove) {
    if (state !== 'play') return
    const probe = new Chess(card.fen)
    let mv
    try {
      mv = probe.move(m)
    } catch {
      return
    }
    const uci = mv.from + mv.to + (mv.promotion ?? '')
    const accept = () => {
      chess.move(m)
      setLast({ from: mv.from, to: mv.to })
    }
    if (uci === card.best || probe.isCheckmate()) {
      accept()
      solved(uci !== card.best, mv.san)
      return
    }
    // A different move can be just as good: let the engine judge it.
    setState('checking')
    engineRef.current ??= new Engine()
    const res = await engineRef.current.search(probe.fen(), { skill: 20, depth: 12, movetime: 500 }).catch(() => null)
    const line = res?.lines[0]
    const mine = line ? -scoreToCp(line.score) : -MATE_CP
    const good = card.evalBest - mine <= 40 || (isMate(card.evalBest) && card.evalBest > 0 && mine >= MATE_CP - 500)
    setState('play')
    if (good) {
      accept()
      solved(true, mv.san)
    } else miss()
  }

  const done = state === 'right' || state === 'shown'
  const from = card.best.slice(0, 2) as Square
  const to = card.best.slice(2, 4) as Square
  const arrows: BoardArrow[] = state === 'shown' || hint >= 2 ? [{ from, to, tone: state === 'shown' ? 'good' : 'hint' }] : []
  const marks: BoardMark[] = hint === 1 && !done ? [{ square: from, tone: 'hint' }] : []

  return (
    <div className="game-layout">
      <div className="board-col">
        <div className={`mk-board s-${state}`}>
          <Board
            fen={chess.fen()}
            orientation={me}
            dests={state === 'play' ? legalDests(chess) : undefined}
            lastMove={last}
            ply={chess.history().length}
            check={checkedKing(chess)}
            coordinates={coordinates}
            onMove={onMove}
            arrows={arrows}
            marks={marks}
          />
        </div>
      </div>
      <aside className="side mk-side">
        <Narrator text={say?.text ?? intro} speakText={say?.speak ?? sayPractice.intro(card.opponent, kids)} />
        {state === 'checking' && <p className="mk-wait">{kids ? 'Let me think about that move…' : 'Checking your move…'}</p>}
        {hint >= 1 && !done && idea && (
          <p className="mk-hint">
            <IconBulb /> {idea}
          </p>
        )}
        {done && (
          <div className="mk-why">
            <span>{kids ? 'What went wrong in your game' : 'Why your move was a mistake'}</span>
            <p>{card.why}</p>
          </div>
        )}
        <div className="mk-actions">
          {done ? (
            <button className="btn btn-primary" onClick={onNext}>
              {kids ? 'Next one!' : 'Next'} <IconArrow />
            </button>
          ) : (
            <>
              <button
                className="btn hint-btn"
                disabled={state !== 'play' || hint >= 2}
                onClick={() => {
                  setHint(hint + 1)
                  report(false)
                }}
              >
                <IconBulb /> {hint === 0 ? (kids ? 'Help me' : 'Hint') : 'Show the move'}
              </button>
              <button className="btn btn-ghost" disabled={state !== 'play'} onClick={showAnswer}>
                {kids ? 'Show me the answer' : 'Show answer'}
              </button>
            </>
          )}
        </div>
        <p className="mk-meta">
          {card.grade === 'blunder' ? '??' : '?'} {card.played} vs {card.opponent} · {new Date(card.at).toLocaleDateString()}
        </p>
      </aside>
    </div>
  )
}
