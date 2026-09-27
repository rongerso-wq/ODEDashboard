import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Chess, type Color, type Square } from 'chess.js'
import Board, { type BoardArrow, type BoardMove } from '../components/Board'
import { IconArrow, IconBack, IconBulb, IconRestart } from '../components/Icons'
import { ALL_LESSONS, lessonById } from '../academy/lessons'
import { bestMoveCount, collectBoard, collectDone, collectMove, type CollectState } from '../academy/collect'
import { recordLesson, starsFor } from '../academy/progress'
import type { ChoiceStep, CollectStep, GoalStep, InfoStep, MovesStep, Step } from '../academy/types'
import { matchesExpected, satisfiesAny } from '../academy/validate'
import { legalDests, checkedKing } from '../chess/game'
import { Engine } from '../engine/engine'
import { navigate } from '../lib/router'
import { useSettings } from '../lib/settings'
import { play } from '../lib/sound'
import { Narrator, VoiceToggle } from '../components/Elias'
import { useSay } from '../lib/useVoice'
import './LessonPlayer.css'

type StepProps<S extends Step> = {
  step: S
  kids: boolean
  /** Elias's opening words, on the first step of a lesson */
  intro?: string
  coordinates: boolean
  onDone: () => void
  onMistake: () => void
}

const said = (s: { text: string; kids?: string }, kids: boolean) => (kids && s.kids ? s.kids : s.text)

export default function LessonPlayer({ id }: { id: string }) {
  const lesson = lessonById(id)
  useEffect(() => {
    if (!lesson) navigate('/learn')
  }, [lesson])
  return lesson ? <Player key={id} id={id} /> : null
}

function Player({ id }: { id: string }) {
  const lesson = lessonById(id)!
  const { mode, coordinates } = useSettings()
  const kids = mode === 'kids'
  const [stepIdx, setStepIdx] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [result, setResult] = useState<number | null>(null) // stars earned when finished
  const step = lesson.steps[stepIdx]

  function next() {
    if (stepIdx + 1 < lesson.steps.length) {
      setStepIdx(stepIdx + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      const stars = starsFor(mistakes)
      recordLesson(lesson.id, stars)
      setResult(stars)
      play('end')
    }
  }

  const title = kids && lesson.kidsTitle ? lesson.kidsTitle : lesson.title
  const chapterTitle = kids && lesson.chapter.kidsTitle ? lesson.chapter.kidsTitle : lesson.chapter.title

  return (
    <div className="page lesson" style={{ ['--hue' as string]: lesson.chapter.hue }}>
      <header className="topbar">
        <div className="brand">
          <button className="icon-btn" onClick={() => navigate('/learn')} aria-label="Back to the Academy">
            <IconBack />
          </button>
          <div className="lesson-titles">
            <span className="lesson-chapter">{chapterTitle}</span>
            <h1 className="screen-title">{title}</h1>
          </div>
        </div>
        <VoiceToggle />
      </header>

      <div className="lesson-progress" role="img" aria-label={`Step ${stepIdx + 1} of ${lesson.steps.length}`}>
        {lesson.steps.map((_, i) => (
          <span key={i} className={i < stepIdx || result !== null ? 'done' : i === stepIdx ? 'now' : ''} />
        ))}
      </div>

      {result !== null ? (
        <Complete
          lessonId={lesson.id}
          stars={result}
          kids={kids}
          onAgain={() => {
            setStepIdx(0)
            setMistakes(0)
            setResult(null)
          }}
        />
      ) : (
        <StepView
          key={stepIdx}
          step={step}
          kids={kids}
          intro={stepIdx === 0 ? (kids ? `Hello, my young friend! Today's lesson: ${title}.` : `Today's lesson: ${title}.`) : undefined}
          coordinates={coordinates}
          onDone={next}
          onMistake={() => setMistakes((m) => m + 1)}
        />
      )}
    </div>
  )
}

function StepView(p: StepProps<Step>) {
  switch (p.step.kind) {
    case 'info':
      return <InfoView {...(p as StepProps<InfoStep>)} />
    case 'collect':
      return <CollectView {...(p as StepProps<CollectStep>)} />
    case 'moves':
      return <MovesView {...(p as StepProps<MovesStep>)} />
    case 'goal':
      return <GoalView {...(p as StepProps<GoalStep>)} />
    case 'choice':
      return <ChoiceView {...(p as StepProps<ChoiceStep>)} />
  }
}

/** Board on one side, the instruction card on the other. */
function Layout({ board, children }: { board?: ReactNode; children: ReactNode }) {
  return (
    <div className={`lesson-layout${board ? '' : ' no-board'}`}>
      {board && <div className="lesson-board">{board}</div>}
      <section className="lesson-card">{children}</section>
    </div>
  )
}

type Feedback = { tone: 'good' | 'bad' | 'hint' | 'info'; text: string } | null

function FeedbackLine({ fb }: { fb: Feedback }) {
  useSay(fb?.text)
  if (!fb) return null
  return (
    <p key={fb.text} className={`lesson-fb fb-${fb.tone}`} role="status">
      {fb.tone === 'good' ? '✓ ' : fb.tone === 'bad' ? '✗ ' : ''}
      {fb.text}
    </p>
  )
}

function NextButton({ onClick, kids, label }: { onClick: () => void; kids: boolean; label?: string }) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => ref.current?.focus({ preventScroll: true }), [])
  return (
    <button ref={ref} className="btn btn-primary lesson-next" onClick={onClick}>
      {label ?? (kids ? 'Next!' : 'Continue')} <IconArrow />
    </button>
  )
}

// ───────────── info ─────────────
function InfoView({ step, kids, intro, coordinates, onDone }: StepProps<InfoStep>) {
  return (
    <Layout
      board={
        step.fen && (
          <Board
            fen={step.fen}
            orientation={step.orientation ?? 'w'}
            coordinates={coordinates}
            animate={false}
            arrows={step.arrows}
            marks={step.marks}
            check={checkedKingSafe(step.fen)}
          />
        )
      }
    >
      <Narrator text={said(step, kids)} speakText={intro ? `${intro} ${said(step, kids)}` : undefined} />
      <NextButton onClick={onDone} kids={kids} />
    </Layout>
  )
}

function checkedKingSafe(fen: string): Square | null {
  try {
    return checkedKing(new Chess(fen))
  } catch {
    return null
  }
}

// ───────────── collect the stars ─────────────
function CollectView({ step, kids, intro, coordinates, onDone, onMistake }: StepProps<CollectStep>) {
  const start: CollectState = useMemo(() => ({ fen: step.fen, stars: step.stars }), [step])
  const best = useMemo(() => bestMoveCount(start), [start])
  const [state, setState] = useState(start)
  const [moves, setMoves] = useState(0)
  const [last, setLast] = useState<{ from: Square; to: Square } | null>(null)
  const [ply, setPly] = useState(0)
  const [animate, setAnimate] = useState(true)
  const done = collectDone(state)

  function onMove(m: BoardMove, viaDrag: boolean) {
    if (done) return
    const r = collectMove(state, m)
    if (!r) return
    setState(r.state)
    setMoves(moves + 1)
    setLast({ from: r.move.from, to: r.move.to })
    setPly(ply + 1)
    setAnimate(!viaDrag)
    play(r.star ? 'star' : r.move.captured ? 'capture' : 'move')
    if (collectDone(r.state)) {
      const extra = best === null ? 0 : moves + 1 - best
      if (extra > 0) for (let i = 0; i < Math.ceil(extra / 2); i++) onMistake()
      setTimeout(() => play('correct'), 250)
    }
  }

  function restart() {
    setState(start)
    setMoves(0)
    setLast(null)
    setPly(ply + 1)
  }

  const total = moves
  const perfect = best !== null && total <= best
  const board = collectBoard(state.fen)

  return (
    <Layout
      board={
        <Board
          fen={state.fen}
          dests={done ? undefined : legalDests(board)}
          stars={state.stars}
          lastMove={last}
          animate={animate}
          ply={ply}
          coordinates={coordinates}
          onMove={onMove}
        />
      }
    >
      <Narrator text={said(step, kids)} speakText={intro ? `${intro} ${said(step, kids)}` : undefined} />
      <div className="collect-stats">
        <span>
          {kids ? 'Moves' : 'Moves'}: <strong>{moves}</strong>
        </span>
        {best !== null && (
          <span>
            {kids ? 'Best' : 'Can be done in'}: <strong>{best}</strong>
          </span>
        )}
        {step.stars.length > 0 && (
          <span>
            ★ left: <strong>{state.stars.length}</strong>
          </span>
        )}
      </div>
      {done ? (
        <>
          <FeedbackLine
            fb={{
              tone: 'good',
              text: perfect
                ? kids
                  ? 'Perfect! You did it in the fewest moves! ⭐'
                  : `Perfect — ${total} moves, the fewest possible.`
                : kids
                  ? `You did it in ${total} moves! It can be done in ${best}.`
                  : `Done in ${total} moves. It can be done in ${best} — try again for a perfect score, or continue.`,
            }}
          />
          <div className="lesson-actions">
            {!perfect && (
              <button className="btn" onClick={restart}>
                <IconRestart /> Try again
              </button>
            )}
            <NextButton onClick={onDone} kids={kids} />
          </div>
        </>
      ) : (
        moves > 0 && (
          <div className="lesson-actions">
            <button className="btn btn-ghost" onClick={restart}>
              <IconRestart /> Start over
            </button>
          </div>
        )
      )}
    </Layout>
  )
}

// ───────────── find the move(s) ─────────────
function uciOfSan(fen: string, san: string): { from: Square; to: Square } | null {
  try {
    const m = new Chess(fen).move(san)
    return { from: m.from, to: m.to }
  } catch {
    return null
  }
}

function MovesView({ step, kids, intro, coordinates, onDone, onMistake }: StepProps<MovesStep>) {
  // Mutated in place; every move also advances `idx`, which re-renders.
  const [chess] = useState(() => new Chess(step.fen))
  const player: Color = step.opponentFirst ? (new Chess(step.fen).turn() === 'w' ? 'b' : 'w') : new Chess(step.fen).turn()
  const [idx, setIdx] = useState(0)
  const [fb, setFb] = useState<Feedback>(null)
  const [wrong, setWrong] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [last, setLast] = useState<{ from: Square; to: Square } | null>(null)
  const [animate, setAnimate] = useState(true)
  const finished = step.any ? idx >= 1 : idx >= step.line.length
  const book = step.verify === 'book'

  // Opponent replies (and the opening move in Black openings) are played automatically.
  useEffect(() => {
    if (finished) return
    const theirs = step.opponentFirst ? idx % 2 === 0 : idx % 2 === 1
    if (!theirs) return
    const t = setTimeout(() => {
      const m = chess.move(step.line[idx].split('|')[0])
      play(m.captured ? 'capture' : chess.inCheck() ? 'check' : 'move')
      setLast({ from: m.from, to: m.to })
      setAnimate(true)
      const note = step.notes?.[idx]
      if (note) setFb({ tone: 'info', text: note })
      setIdx(idx + 1)
    }, 650)
    return () => clearTimeout(t)
  }, [idx, finished, chess, step])

  const myTurn = !finished && chess.turn() === player && (step.opponentFirst ? idx % 2 === 1 : idx % 2 === 0)
  const expected = !finished && myTurn ? step.line[idx] : null
  const expectedMove = expected ? uciOfSan(chess.fen(), expected.split('|')[0]) : null

  function onMove(input: BoardMove, viaDrag: boolean) {
    if (!myTurn || !expected) return
    const probe = new Chess(chess.fen())
    let m
    try {
      m = probe.move(input)
    } catch {
      return
    }
    const ok = step.any ? satisfiesAny(m, step.any) : matchesExpected(m.san, expected)
    if (!ok) {
      play('error')
      if (wrong < 2) onMistake()
      setWrong(wrong + 1)
      setFb({
        tone: 'bad',
        text:
          wrong === 0
            ? kids
              ? 'Not quite — try again!'
              : 'Not quite. Try again.'
            : `${step.hint ?? 'Look again carefully.'}`,
      })
      return
    }
    chess.move(input)
    setLast({ from: m.from, to: m.to })
    setAnimate(!viaDrag)
    setShowAnswer(false)
    setWrong(0)
    const doneNow = step.any || idx + 1 >= step.line.length
    play(doneNow ? 'correct' : m.captured ? 'capture' : chess.inCheck() ? 'check' : 'move')
    const note = step.notes?.[idx]
    const doneText = step.done ?? (kids ? 'Well done!' : 'Correct!')
    setFb(
      doneNow
        ? { tone: 'good', text: note ? `${note} ${doneText}` : doneText }
        : { tone: 'good', text: note ?? (kids ? 'Yes!' : 'Correct.') },
    )
    setIdx(idx + 1)
  }

  function hint() {
    if (!showAnswer && step.hint && fb?.text !== step.hint) setFb({ tone: 'hint', text: step.hint })
    else {
      setShowAnswer(true)
      onMistake()
    }
  }

  const arrows: BoardArrow[] = []
  // Openings are learned by following the moves: the next move is always shown.
  if (expectedMove && (book || showAnswer)) arrows.push({ ...expectedMove, tone: 'hint' })

  return (
    <Layout
      board={
        <Board
          fen={chess.fen()}
          orientation={step.orientation ?? player}
          dests={myTurn ? legalDests(chess) : undefined}
          lastMove={last}
          animate={animate}
          ply={chess.history().length}
          check={checkedKing(chess)}
          coordinates={coordinates}
          onMove={onMove}
          arrows={arrows}
        />
      }
    >
      <Narrator text={said(step, kids)} speakText={intro ? `${intro} ${said(step, kids)}` : undefined} />
      {book && expected && (
        <p className="book-next">
          {kids ? 'Your move:' : 'Next move:'} <strong>{expected.split('|')[0]}</strong>
        </p>
      )}
      {!myTurn && !finished && <p className="lesson-wait">{kids ? 'Your opponent is moving…' : 'Opponent to move…'}</p>}
      <FeedbackLine fb={fb} />
      <div className="lesson-actions">
        {finished ? (
          <NextButton onClick={onDone} kids={kids} />
        ) : (
          myTurn &&
          !book && (
            <button className="btn hint-btn" onClick={hint} disabled={showAnswer}>
              <IconBulb /> {showAnswer ? 'Answer shown' : fb?.tone === 'hint' ? 'Show me' : kids ? 'Help me' : 'Hint'}
            </button>
          )
        )}
      </div>
    </Layout>
  )
}

// ───────────── reach a goal against the engine ─────────────
function countPieces(c: Chess, color: Color, type?: string) {
  let n = 0
  for (const row of c.board()) for (const p of row) if (p && p.color === color && p.type !== 'k' && (!type || p.type === type)) n++
  return n
}
const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }
function materialOf(c: Chess, color: Color) {
  let n = 0
  for (const row of c.board()) for (const p of row) if (p && p.color === color) n += VAL[p.type]
  return n
}

function GoalView({ step, kids, intro, coordinates, onDone, onMistake }: StepProps<GoalStep>) {
  const [chess, setChess] = useState(() => new Chess(step.fen))
  const [, setVersion] = useState(0) // chess is mutated in place; this re-renders
  const me = useMemo(() => new Chess(step.fen).turn(), [step.fen])
  const them: Color = me === 'w' ? 'b' : 'w'
  const startMaterial = useMemo(() => materialOf(new Chess(step.fen), me), [step.fen, me])
  const [myMoves, setMyMoves] = useState(0)
  const [state, setState] = useState<'play' | 'thinking' | 'won' | 'lost'>('play')
  const [fb, setFb] = useState<Feedback>(null)
  const [last, setLast] = useState<{ from: Square; to: Square } | null>(null)
  const [animate, setAnimate] = useState(true)
  const [hintArrow, setHintArrow] = useState<BoardArrow | null>(null)
  const engineRef = useRef<Engine | null>(null)
  useEffect(() => {
    engineRef.current = new Engine()
    return () => engineRef.current?.terminate()
  }, [])

  const lose = (text: string) => {
    setState('lost')
    setFb({ tone: 'bad', text })
    play('error')
  }
  const win = () => {
    setState('won')
    setFb({ tone: 'good', text: step.done ?? 'Goal reached!' })
    play('correct')
  }

  /** Checks after any move; returns true when the step is over. */
  function judge(c: Chess, lastBy: Color, moveCount: number): boolean {
    const g = step.goal
    if (c.isCheckmate()) {
      if (lastBy === me && g === 'mate') win()
      else if (lastBy === me) win()
      else lose(kids ? 'Oh no — you got checkmated! Try again.' : 'You were checkmated. Try again.')
      return true
    }
    // Capturing the last enemy piece usually leaves K v K, a draw by the rules — for a
    // "capture" goal that is the win, so it must be checked before the draw (QA C9).
    if (g === 'capture' && countPieces(c, them) === 0) {
      win()
      return true
    }
    if (c.isDraw()) {
      if (g === 'hold') win()
      else lose(c.isStalemate() ? (kids ? "Stalemate — it's a tie! Leave the king a square. Try again." : 'Stalemate — a draw. Always leave the king a square. Try again.') : 'The game ended in a draw. Try again.')
      return true
    }
    if (g === 'promote' && lastBy === me && c.history({ verbose: true }).at(-1)?.promotion) {
      win()
      return true
    }
    if (g === 'promote' && countPieces(c, me, 'p') === 0 && !c.history({ verbose: true }).some((m) => m.color === me && m.promotion)) {
      lose(kids ? 'The pawn was captured. Try again!' : 'Your pawn was lost. Try again.')
      return true
    }
    if ((g === 'capture' || g === 'hold') && lastBy === them && c.history({ verbose: true }).at(-1)?.promotion) {
      lose(kids ? 'The pawn became a queen. Try again!' : 'The pawn promoted. Try again.')
      return true
    }
    if (g === 'hold' && materialOf(c, me) < startMaterial) {
      lose('You lost material. Try again.')
      return true
    }
    if (lastBy === them && step.within && moveCount >= step.within) {
      if (g === 'hold') win()
      else lose(kids ? 'Out of moves! Try again.' : `You have used your ${step.within} moves. Try again.`)
      return true
    }
    return false
  }

  async function reply(c: Chess, moveCount: number) {
    setState('thinking')
    const started = performance.now()
    const res = await engineRef.current!.search(c.fen(), { skill: 20, movetime: 350 }).catch(() => null)
    const wait = 450 - (performance.now() - started)
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    if (!res?.bestmove) {
      setState('play')
      return
    }
    const m = c.move({ from: res.bestmove.slice(0, 2), to: res.bestmove.slice(2, 4), promotion: res.bestmove[4] })
    play(m.captured ? 'capture' : c.inCheck() ? 'check' : 'move')
    setLast({ from: m.from, to: m.to })
    setAnimate(true)
    setVersion((v) => v + 1)
    if (!judge(c, them, moveCount)) setState('play')
  }

  function onMove(input: BoardMove, viaDrag: boolean) {
    if (state !== 'play') return
    let m
    try {
      m = chess.move(input)
    } catch {
      return
    }
    setHintArrow(null)
    setLast({ from: m.from, to: m.to })
    setAnimate(!viaDrag)
    setVersion((v) => v + 1)
    const count = myMoves + 1
    setMyMoves(count)
    play(m.captured ? 'capture' : chess.inCheck() ? 'check' : 'move')
    if (!judge(chess, me, count)) void reply(chess, count)
  }

  function retry() {
    onMistake()
    engineRef.current?.stop()
    setChess(new Chess(step.fen))
    setMyMoves(0)
    setState('play')
    setFb(null)
    setLast(null)
    setHintArrow(null)
    setVersion((v) => v + 1)
  }

  async function hint() {
    if (fb?.tone !== 'hint' && step.hint) {
      setFb({ tone: 'hint', text: step.hint })
      return
    }
    onMistake()
    const res = await engineRef.current!.search(chess.fen(), { skill: 20, movetime: 400 }).catch(() => null)
    if (res?.bestmove) setHintArrow({ from: res.bestmove.slice(0, 2) as Square, to: res.bestmove.slice(2, 4) as Square, tone: 'hint' })
  }

  const left = step.within ? step.within - myMoves : null

  return (
    <Layout
      board={
        <Board
          fen={chess.fen()}
          orientation={step.orientation ?? me}
          dests={state === 'play' ? legalDests(chess) : undefined}
          lastMove={last}
          animate={animate}
          ply={chess.history().length}
          check={checkedKing(chess)}
          coordinates={coordinates}
          onMove={onMove}
          arrows={hintArrow ? [hintArrow] : []}
        />
      }
    >
      <Narrator text={said(step, kids)} speakText={intro ? `${intro} ${said(step, kids)}` : undefined} />
      <div className="collect-stats">
        {left !== null && (
          <span>
            {step.goal === 'hold' ? (kids ? 'Moves to survive' : 'Moves to hold') : kids ? 'Moves left' : 'Moves left'}:{' '}
            <strong>{Math.max(0, left)}</strong>
          </span>
        )}
        {state === 'thinking' && <span className="lesson-wait">{kids ? 'The computer is thinking…' : 'Computer to move…'}</span>}
      </div>
      <FeedbackLine fb={fb} />
      <div className="lesson-actions">
        {state === 'won' ? (
          <NextButton onClick={onDone} kids={kids} />
        ) : state === 'lost' ? (
          <button className="btn btn-primary" onClick={retry}>
            <IconRestart /> {kids ? 'Try again!' : 'Try again'}
          </button>
        ) : (
          <>
            <button className="btn hint-btn" onClick={hint} disabled={state !== 'play'}>
              <IconBulb /> {fb?.tone === 'hint' ? 'Show me a move' : kids ? 'Help me' : 'Hint'}
            </button>
            {myMoves > 0 && (
              <button className="btn btn-ghost" onClick={retry}>
                <IconRestart /> Restart
              </button>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}

// ───────────── multiple choice ─────────────
function ChoiceView({ step, kids, intro, coordinates, onDone, onMistake }: StepProps<ChoiceStep>) {
  const [picked, setPicked] = useState<number | null>(null)
  const answered = picked !== null
  const right = picked === step.answer

  function pick(i: number) {
    if (answered) return
    setPicked(i)
    if (i === step.answer) play('correct')
    else {
      play('error')
      onMistake()
    }
  }

  return (
    <Layout
      board={
        <Board
          fen={step.fen}
          orientation={step.orientation ?? 'w'}
          coordinates={coordinates}
          animate={false}
          arrows={answered ? step.arrows : undefined}
          marks={answered ? step.marks : undefined}
          check={answered ? checkedKingSafe(step.fen) : null}
        />
      }
    >
      <Narrator text={said(step, kids)} speakText={intro ? `${intro} ${said(step, kids)}` : undefined} />
      <div className="choices" role="group" aria-label="Answers">
        {step.options.map((o, i) => (
          <button
            key={o}
            className={`choice${answered && i === step.answer ? ' right' : ''}${answered && i === picked && !right ? ' wrong' : ''}`}
            onClick={() => pick(i)}
            disabled={answered && i !== picked && i !== step.answer}
            aria-pressed={picked === i}
          >
            {o}
          </button>
        ))}
      </div>
      {answered && (
        <>
          <FeedbackLine fb={{ tone: right ? 'good' : 'bad', text: `${right ? (kids ? 'Yes! ' : 'Correct. ') : kids ? 'Not this time. ' : 'Not quite. '}${step.explain}` }} />
          <div className="lesson-actions">
            <NextButton onClick={onDone} kids={kids} />
          </div>
        </>
      )}
    </Layout>
  )
}

// ───────────── lesson complete ─────────────
function Complete({ lessonId, stars, kids, onAgain }: { lessonId: string; stars: number; kids: boolean; onAgain: () => void }) {
  const i = ALL_LESSONS.findIndex((l) => l.id === lessonId)
  const next = ALL_LESSONS[i + 1]
  const title = ['', kids ? 'You did it!' : 'Lesson complete', kids ? 'Great job!' : 'Well done!', kids ? 'Superstar! 🌟' : 'Perfect!'][stars]
  const praise = [
    '',
    kids ? 'You finished the lesson, my friend. Try it once more and you will shine even brighter.' : 'You finished the lesson. Practice makes permanent — try it once more for all three stars.',
    kids ? 'Very good! Just a little slip or two. You are learning fast!' : 'Very good. Only a slip or two — you are learning quickly.',
    kids ? 'Three stars! Not a single mistake. I am so proud of you!' : 'Three stars, without a single mistake. Splendid work.',
  ][stars]
  return (
    <section className="complete" aria-live="polite">
      <Narrator text={praise} speakText={`${title}. ${praise}`} compact />
      <div className="complete-stars" role="img" aria-label={`${stars} of 3 stars`}>
        {[1, 2, 3].map((n) => (
          <span key={n} className={n <= stars ? 'on' : ''} style={{ animationDelay: `${n * 0.15}s` }}>
            ★
          </span>
        ))}
      </div>
      <h2>{title}</h2>
      <div className="complete-actions">
        {next && (
          <button className="btn btn-primary" onClick={() => navigate(`/learn/${next.id}`)}>
            Next: {kids && next.kidsTitle ? next.kidsTitle : next.title} <IconArrow />
          </button>
        )}
        <button className="btn" onClick={onAgain}>
          <IconRestart /> Play again
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/learn')}>
          Back to the Academy
        </button>
      </div>
    </section>
  )
}
