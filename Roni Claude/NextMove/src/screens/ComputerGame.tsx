import { useEffect, useMemo, useRef, useState } from 'react'
import Board, { type BoardMove } from '../components/Board'
import { BotAvatar, BotSays } from '../components/BotAvatar'
import { GameOverDialog, MoveList, PlayerStrip } from '../components/GamePanels'
import { IconBack, IconCpu, IconFlag, IconFlip, IconMute, IconRestart, IconSound, IconUndo } from '../components/Icons'
import { newClock, pause, resume, timeControlById, useClock } from '../chess/clock'
import { material, other, outcomeText, timeoutOutcome, type Color, type Move } from '../chess/game'
import {
  addToHistory,
  loadCurrentGame,
  saveCurrentGame,
  saveReviewGame,
  type ComputerConfig,
  type SavedComputerGame,
} from '../chess/saved'
import { useChessGame } from '../chess/useChessGame'
import { botById, randomMove } from '../engine/bots'
import { botEngine, parseUci } from '../engine/engine'
import { goBack, navigate } from '../lib/router'
import { useSettings } from '../lib/settings'
import { useConfirm } from '../lib/useConfirm'
import CoachCard from '../components/CoachCard'
import { VoiceToggle } from '../components/Elias'
import { commentOnMove } from '../coach/commentary'
import { addCards, cardFromFeedback } from '../mistakes/deck'
import { stop as stopVoice } from '../lib/voice'
import type { BoardArrow, BoardMark } from '../components/Board'
import { useCoach } from '../coach/useCoach'
import { youVoice } from '../coach/explain'
import type { Square } from 'chess.js'
import './GameScreen.css'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const uciOf = (m: Move | null) => (m ? m.from + m.to + (m.promotion ?? '') : null)

type Say = 'greet' | 'win' | 'lose' | 'draw'

export default function ComputerGame() {
  const [saved] = useState(loadCurrentGame)
  useEffect(() => {
    if (!saved) navigate('/play/computer', { replace: true })
  }, [saved])
  return saved ? <Game saved={saved} /> : null
}

function Game({ saved }: { saved: SavedComputerGame }) {
  const settings = useSettings()
  const { mode, sound, coordinates, update } = settings
  const kids = mode === 'kids'
  const [config, setConfig] = useState<ComputerConfig>(saved.config)
  const bot = botById(config.botId)
  const me = config.color
  const botColor = other(me)
  const tc = timeControlById(config.tc)

  const game = useChessGame(undefined, saved.moves)
  // The coach is on by default in relaxed games and off in clock games (a pro can switch it on).
  const [coachOn, setCoachOn] = useState(() => !tc && settings.coach)
  const voice = useMemo(() => youVoice(bot.name, kids), [bot.name, kids])
  const coach = useCoach(game, me, coachOn, voice)
  // "Show the better move": an arrow on the position before the mistake.
  const [lesson, setLesson] = useState<{ fen: string; from: Square; to: Square } | null>(null)
  const engine = useMemo(botEngine, [])
  const [engineFailed, setEngineFailed] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [orientation, setOrientation] = useState<Color>(me)
  const [say, setSay] = useState<Say>('greet')
  const [dismissed, setDismissed] = useState<string | null>(null)
  const { pending: confirm, ask } = useConfirm<'resign' | 'new'>()

  const over = !!game.outcome
  const resultKey = `${game.ply}:${game.outcome?.kind}`

  // A resumed game's clock continues for the side to move.
  const [initialClock] = useState(() =>
    saved.clock && saved.moves.length > 0 && !game.outcome ? resume(saved.clock, game.turn, performance.now()) : saved.clock,
  )
  const clock = useClock(initialClock, (flagged) => game.finish(timeoutOutcome(game.chess, flagged)))

  // ---- the bot's turn ----
  useEffect(() => {
    if (over || game.turn !== botColor) return
    let cancelled = false
    setThinking(true)
    const started = performance.now()

    const pick = async (): Promise<string | null> => {
      if (Math.random() < bot.randomness) return uciOf(randomMove(game.chess))
      try {
        const res = await engine.search(game.fen, bot.search)
        return res.bestmove
      } catch {
        setEngineFailed(true)
        return cancelled ? null : uciOf(randomMove(game.chess))
      }
    }

    pick().then(async (uci) => {
      // Never answer instantly: a short pause reads as "thinking" and lets the player see the board.
      const minDelay = tc && tc.minutes <= 3 ? 150 : 450 + Math.random() * 550
      const wait = minDelay - (performance.now() - started)
      if (wait > 0) await sleep(wait)
      if (cancelled || !uci) return
      setThinking(false)
      if (game.move(parseUci(uci) as BoardMove)) clock.moved(botColor)
    })

    return () => {
      cancelled = true
      engine.stop()
      setThinking(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.fen, over])

  function onUserMove(m: BoardMove, viaDrag: boolean) {
    if (over || game.turn !== me) return
    if (game.move(m, { animate: !viaDrag })) {
      clock.moved(me)
      stopVoice() // a new move makes whatever Elias was still saying out of date
    }
  }

  // Elias on the opponent's last move. Held back while he is still grading the player's move,
  // so he always speaks in order: your move first, then theirs.
  const lastMove = game.history.at(-1)
  const commentary = useMemo(() => {
    if (!lastMove || lastMove.color !== botColor) return null
    const c = commentOnMove(lastMove, game.ply - 1, { bot: bot.name, kids })
    return c ? { san: lastMove.san, ply: game.ply, comment: c } : null
  }, [lastMove, botColor, game.ply, bot.name, kids])

  // Every mistake the coach catches becomes a "My mistakes" practice card.
  useEffect(() => {
    const card = coach.feedback && cardFromFeedback(coach.feedback, bot.name)
    if (card) addCards([card])
  }, [coach.feedback, bot.name])

  // ---- saving: after every move, and when leaving the page ----
  const persistRef = useRef<() => void>(() => {})
  useEffect(() => {
    persistRef.current = () => {
      if (game.outcome) return
      saveCurrentGame({
        config,
        moves: game.history.map((m) => m.san),
        clock: clock.state ? pause(clock.state, performance.now()) : null,
      })
    }
  })
  useEffect(() => {
    persistRef.current()
  }, [game.ply])
  useEffect(() => {
    const onHide = () => persistRef.current()
    window.addEventListener('pagehide', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      onHide()
    }
  }, [])

  // ---- game over: stop the clock, record the result once ----
  const recorded = useRef(false)
  useEffect(() => {
    const o = game.outcome
    if (!o) return
    clock.stop()
    if (recorded.current) return
    recorded.current = true
    const result = o.winner === null ? 'draw' : o.winner === me ? 'win' : 'loss'
    setSay(result === 'win' ? 'lose' : result === 'loss' ? 'win' : 'draw')
    addToHistory({
      botId: bot.id,
      color: me,
      result,
      kind: o.kind,
      moves: game.ply,
      tc: config.tc,
      at: Date.now(),
      pgn: game.chess.pgn(),
    })
    saveCurrentGame(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.outcome])

  function rematch() {
    const color: Color = config.choice === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : config.color
    const next = { ...config, color }
    engine.stop()
    engine.newGame()
    recorded.current = false
    setConfig(next)
    setOrientation(color)
    setSay('greet')
    setDismissed(null)
    game.reset()
    const freshClock = tc ? newClock(tc) : null
    clock.reset(freshClock)
    saveCurrentGame({ config: next, moves: [], clock: freshClock })
  }

  function takeBack() {
    // Undo the bot's reply too, so it's the player's turn again.
    game.undo(game.turn === me ? 2 : 1)
  }

  function tryAgain() {
    setLesson(null)
    takeBack()
  }

  function showBetter() {
    const fb = coach.feedback
    if (!fb?.bestUci) return
    takeBack()
    setLesson({ fen: fb.before, from: fb.bestUci.slice(0, 2) as Square, to: fb.bestUci.slice(2, 4) as Square })
  }

  function openReview() {
    if (!game.outcome) return
    saveReviewGame({
      moves: game.history.map((m) => m.san),
      white: me === 'w' ? 'You' : bot.name,
      black: me === 'b' ? 'You' : bot.name,
      me,
      result: heading ?? outcomeText(game.outcome, kids).title,
      config,
    })
    navigate('/review')
  }

  // Coach overlays on the board.
  const arrows: BoardArrow[] = []
  const marks: BoardMark[] = []
  if (lesson && lesson.fen === game.fen) arrows.push({ from: lesson.from, to: lesson.to, tone: 'good' })
  if (coach.hint?.arrow) arrows.push({ ...coach.hint.arrow, tone: 'hint' })
  else if (coach.hint?.square) marks.push({ square: coach.hint.square, tone: 'hint' })

  const myMoves = me === 'w' ? Math.ceil(game.ply / 2) : Math.floor(game.ply / 2)
  const mat = material(game.chess)
  const top = other(orientation)
  const sayText =
    say === 'greet' ? (kids ? bot.greet.kids : bot.greet.classic) : say === 'win' ? bot.onWin : say === 'lose' ? bot.onLose : 'A draw — well fought!'

  const status = over
    ? 'Game over'
    : game.turn === botColor
      ? `${bot.name} is thinking…`
      : game.check
        ? kids
          ? 'Check! Save your king!'
          : 'You are in check'
        : kids
          ? 'Your turn!'
          : 'Your move'

  const strip = (c: Color) =>
    c === botColor ? (
      <PlayerStrip
        color={c}
        name={bot.name}
        avatar={<BotAvatar bot={bot} size={36} />}
        toMove={game.turn === c}
        thinking={thinking}
        material={mat}
        over={over}
        clock={tc ? clock.time(c) : undefined}
        clockRunning={clock.running === c}
      />
    ) : (
      <PlayerStrip
        color={c}
        name="You"
        toMove={game.turn === c}
        material={mat}
        over={over}
        clock={tc ? clock.time(c) : undefined}
        clockRunning={clock.running === c}
      />
    )

  const result = game.outcome ? (game.outcome.winner === null ? 'draw' : game.outcome.winner === me ? 'win' : 'loss') : null
  const heading =
    result === 'win'
      ? kids
        ? 'You won! 🎉'
        : 'You won'
      : result === 'loss'
        ? kids
          ? `${bot.name} won this time`
          : `${bot.name} wins`
        : undefined

  return (
    <div className="page game">
      <header className="topbar">
        <div className="brand">
          <button className="icon-btn" onClick={() => goBack('/play/computer')} aria-label="Back to opponents">
            <IconBack />
          </button>
          <h1 className="screen-title">vs {bot.name}</h1>
        </div>
        <div className="topbar-actions">
          <VoiceToggle />
          <button className="btn change-opp" onClick={() => goBack('/play/computer')}>
            <IconCpu />
            <span>Change opponent</span>
          </button>
          <button className="icon-btn" onClick={() => update({ sound: !sound })} aria-label={sound ? 'Turn sound off' : 'Turn sound on'}>
            {sound ? <IconSound /> : <IconMute />}
          </button>
        </div>
      </header>

      <div className="game-layout">
        <div className="board-col">
          {strip(top)}
          <Board
            fen={game.fen}
            orientation={orientation}
            dests={!over && game.turn === me ? game.dests : undefined}
            lastMove={game.lastMove}
            animate={game.animate}
            ply={game.ply}
            check={game.check}
            coordinates={coordinates}
            onMove={onUserMove}
            arrows={arrows}
            marks={marks}
          />
          {strip(orientation)}
        </div>

        <aside className="side">
          <div className="side-bot">
            <BotSays bot={bot} text={sayText} />
          </div>

          {engineFailed && (
            <p className="engine-warning" role="alert">
              The chess engine couldn't start on this device, so {bot.name} is playing random moves.
            </p>
          )}

          <div
            className={`status side-status${game.check && !over && game.turn === me ? ' in-check' : ''}`}
            role="status"
            aria-live="polite"
          >
            {status}
          </div>

          <div className="side-coach">
            <CoachCard
              kids={kids}
              enabled={coachOn}
              onToggle={(on) => {
                setCoachOn(on)
                if (!tc) update({ coach: on })
              }}
              feedback={coach.feedback}
              pending={coach.pending}
              hint={over ? null : coach.hint}
              hintLoading={coach.hintLoading}
              canHint={!tc && !over}
              onHint={coach.askHint}
              onTryAgain={!tc && !over ? tryAgain : undefined}
              onShowBetter={showBetter}
              myTurn={game.turn === me}
              commentary={over || coach.pending ? null : commentary}
              opponent={bot.name}
            />
          </div>

          <div className="side-moves">
            <MoveList history={game.history} grades={coachOn ? coach.grades : undefined} />
          </div>

          <div className="controls">
            {!tc && (
              <button className="ctrl" onClick={takeBack} disabled={over || myMoves === 0}>
                <IconUndo />
                <span>Undo</span>
              </button>
            )}
            <button className="ctrl" onClick={() => setOrientation(other(orientation))}>
              <IconFlip />
              <span>Flip</span>
            </button>
            <button
              className={`ctrl${confirm === 'resign' ? ' confirming' : ''}`}
              disabled={over || myMoves === 0}
              onClick={() => ask('resign', () => game.finish({ kind: 'resign', winner: botColor }))}
            >
              <IconFlag />
              <span>{confirm === 'resign' ? 'Sure?' : 'Resign'}</span>
            </button>
            <button
              className={`ctrl${confirm === 'new' ? ' confirming' : ''}`}
              disabled={game.ply === 0}
              onClick={() => (over ? rematch() : ask('new', rematch))}
            >
              <IconRestart />
              <span>{confirm === 'new' ? 'Sure?' : 'New'}</span>
            </button>
          </div>
        </aside>
      </div>

      {game.outcome && dismissed !== resultKey && (
        <GameOverDialog
          outcome={game.outcome}
          kids={kids}
          heading={heading}
          note={<BotSays bot={bot} text={sayText} />}
          againLabel="Rematch"
          onAgain={rematch}
          onAnalyse={openReview}
          onReview={() => setDismissed(resultKey)}
          onHome={() => goBack('/')}
        />
      )}
    </div>
  )
}
