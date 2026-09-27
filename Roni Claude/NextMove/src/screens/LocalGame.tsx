import { useState } from 'react'
import Board from '../components/Board'
import { GameOverDialog, MoveList, PlayerStrip } from '../components/GamePanels'
import { IconBack, IconFlag, IconFlip, IconHandshake, IconMute, IconRestart, IconSound, IconUndo } from '../components/Icons'
import { colorName, material, other, outcomeText, type Color } from '../chess/game'
import { saveReviewGame } from '../chess/saved'
import { useChessGame } from '../chess/useChessGame'
import { navigate } from '../lib/router'
import { useSettings } from '../lib/settings'
import { useConfirm } from '../lib/useConfirm'
import './GameScreen.css'

/** Pass-and-play: two people, one device. */
export default function LocalGame() {
  const game = useChessGame()
  const { mode, sound, coordinates, update } = useSettings()
  const kids = mode === 'kids'
  const [orientation, setOrientation] = useState<Color>('w')
  const [autoFlip, setAutoFlip] = useState(false)
  const { pending: confirm, ask } = useConfirm<'resign' | 'draw' | 'new'>()
  // "See the board" hides this particular result only; a later result shows again.
  const [dismissed, setDismissed] = useState<string | null>(null)

  const over = !!game.outcome
  const resultKey = `${game.ply}:${game.outcome?.kind}`
  const mat = material(game.chess)
  const view: Color = autoFlip && !over ? game.turn : orientation
  const top = other(view)

  function newGame() {
    game.reset()
    setDismissed(null)
  }

  const status = over
    ? 'Game over'
    : game.check
      ? kids
        ? `Check! ${colorName(game.turn)}, save your king!`
        : `${colorName(game.turn)} is in check`
      : kids
        ? `${colorName(game.turn)}'s turn — move a ${colorName(game.turn).toLowerCase()} piece`
        : `${colorName(game.turn)} to move`

  return (
    <div className="page game">
      <header className="topbar">
        <div className="brand">
          <button className="icon-btn" onClick={() => navigate('/')} aria-label="Back to home">
            <IconBack />
          </button>
          <h1 className="screen-title">Play a Friend</h1>
        </div>
        <div className="topbar-actions">
          <button className="icon-btn" onClick={() => update({ sound: !sound })} aria-label={sound ? 'Turn sound off' : 'Turn sound on'}>
            {sound ? <IconSound /> : <IconMute />}
          </button>
        </div>
      </header>

      <div className="game-layout">
        <div className="board-col">
          <PlayerStrip color={top} name={colorName(top)} toMove={game.turn === top} material={mat} over={over} />
          <Board
            fen={game.fen}
            orientation={view}
            dests={over ? undefined : game.dests}
            lastMove={game.lastMove}
            animate={game.animate}
            ply={game.ply}
            check={game.check}
            coordinates={coordinates}
            onMove={(m, viaDrag) => game.move(m, { animate: !viaDrag })}
          />
          <PlayerStrip color={view} name={colorName(view)} toMove={game.turn === view} material={mat} over={over} />
        </div>

        <aside className="side">
          <div className={`status${game.check && !over ? ' in-check' : ''}`} role="status" aria-live="polite">
            {status}
          </div>

          <MoveList history={game.history} />

          <div className="controls">
            <button className="ctrl" onClick={() => game.undo()} disabled={game.ply === 0}>
              <IconUndo />
              <span>Undo</span>
            </button>
            <button className="ctrl" onClick={() => setOrientation(other(orientation))} disabled={autoFlip && !over}>
              <IconFlip />
              <span>Flip</span>
            </button>
            <button
              className={`ctrl${confirm === 'draw' ? ' confirming' : ''}`}
              disabled={over || game.ply < 2}
              onClick={() => ask('draw', () => game.finish({ kind: 'agreement', winner: null }))}
            >
              <IconHandshake />
              <span>{confirm === 'draw' ? 'Sure?' : 'Draw'}</span>
            </button>
            <button
              className={`ctrl${confirm === 'resign' ? ' confirming' : ''}`}
              disabled={over || game.ply === 0}
              onClick={() => ask('resign', () => game.finish({ kind: 'resign', winner: other(game.turn) }))}
            >
              <IconFlag />
              <span>{confirm === 'resign' ? 'Sure?' : 'Resign'}</span>
            </button>
            <button
              className={`ctrl${confirm === 'new' ? ' confirming' : ''}`}
              disabled={game.ply === 0}
              onClick={() => (over ? newGame() : ask('new', newGame))}
            >
              <IconRestart />
              <span>{confirm === 'new' ? 'Sure?' : 'New'}</span>
            </button>
          </div>

          <div className="toggles">
            <label className="toggle">
              <input type="checkbox" checked={autoFlip} onChange={(e) => setAutoFlip(e.target.checked)} />
              <span>Turn the board for each player</span>
            </label>
            <label className="toggle">
              <input type="checkbox" checked={coordinates} onChange={(e) => update({ coordinates: e.target.checked })} />
              <span>Show square names (a–h, 1–8)</span>
            </label>
          </div>
        </aside>
      </div>

      {game.outcome && dismissed !== resultKey && (
        <GameOverDialog
          outcome={game.outcome}
          kids={kids}
          onAgain={newGame}
          onReview={() => setDismissed(resultKey)}
          onHome={() => navigate('/')}
          onAnalyse={() => {
            saveReviewGame({
              moves: game.history.map((m) => m.san),
              white: 'White',
              black: 'Black',
              me: null,
              result: outcomeText(game.outcome!, kids).title,
            })
            navigate('/review')
          }}
        />
      )}
    </div>
  )
}
