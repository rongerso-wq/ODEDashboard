import { useState, type ReactNode } from 'react'
import { IconArrow, IconBook, IconCpu, IconPuzzle, IconGear, IconUsers, Logo } from '../components/Icons'
import ModeSwitch from '../components/ModeSwitch'
import { navigate } from '../lib/router'
import { useSettings } from '../lib/settings'
import Board from '../components/Board'
import SettingsSheet from '../components/SettingsSheet'
import MistakesBanner from '../components/MistakesBanner'
import { BotAvatar } from '../components/BotAvatar'
import { botById } from '../engine/bots'
import { loadCurrentGame } from '../chess/saved'
import './Home.css'

// The Italian Game: the opening most beginners learn first.
const HERO_FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3'

// Home is deliberately sparse: an icon and a few words per destination; the screens explain themselves.
const TILES: { id: string; icon: ReactNode; title: string; kids: string; to: string }[] = [
  { id: 'learn', icon: <IconBook />, title: 'Learn', kids: 'Learn', to: '/learn' },
  { id: 'computer', icon: <IconCpu />, title: 'Play the computer', kids: 'Play a game', to: '/play/computer' },
  { id: 'friend', icon: <IconUsers />, title: 'Play a friend', kids: 'Play a friend', to: '/play/local' },
  { id: 'puzzles', icon: <IconPuzzle />, title: 'Puzzles', kids: 'Puzzles', to: '/puzzles' },
]

export default function Home() {
  const { mode } = useSettings()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const kids = mode === 'kids'
  // a returning player sees their unfinished game first
  const [unfinished] = useState(() => {
    const g = loadCurrentGame()
    return g && g.moves.length > 0 ? g : null
  })
  return (
    <div className="home">
      <header className="topbar">
        <div className="brand">
          <Logo />
          <span className="wordmark">NextMove</span>
        </div>
        <div className="topbar-actions">
          <ModeSwitch />
          <button className="icon-btn" onClick={() => setSettingsOpen(true)} aria-label="Settings">
            <IconGear />
          </button>
        </div>
      </header>
      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}

      <section className="hero">
        <div className="hero-text">
          <h1>{kids ? "Let's learn chess!" : 'Learn chess.'}</h1>
          <p className="lede">Free. No ads. Works offline.</p>
          <button className="btn btn-primary hero-cta" onClick={() => navigate('/learn')}>
            {kids ? "Let's go!" : 'Start learning'} <IconArrow />
          </button>
        </div>
        <div className="hero-board" aria-hidden="true">
          <Board fen={HERO_FEN} lastMove={{ from: 'f1', to: 'c4' }} animate={false} coordinates={false} />
        </div>
      </section>

      {unfinished && (
        <button className="mk-banner resume-banner" onClick={() => navigate('/play/computer/game')}>
          <BotAvatar bot={botById(unfinished.config.botId)} size={44} />
          <div>
            <strong>
              {kids ? 'Finish your game with' : 'Continue your game vs'} {botById(unfinished.config.botId).name}
            </strong>
            <span>
              Move {Math.ceil(unfinished.moves.length / 2)} · you play {unfinished.config.color === 'w' ? 'White' : 'Black'}
            </span>
          </div>
          <IconArrow />
        </button>
      )}

      <MistakesBanner kids={kids} />

      <nav className="tiles" aria-label="Main menu">
        {TILES.map((t) => (
          <button key={t.id} className={`tile tile-${t.id}`} onClick={() => navigate(t.to)}>
            <span className="tile-icon">{t.icon}</span>
            <span className="tile-title">{kids ? t.kids : t.title}</span>
          </button>
        ))}
      </nav>

      <footer className="home-foot">
        <p className="home-author">Created by: Dr. Roni Gershonovitch</p>
        <p>Pieces: cburnett (CC BY-SA 3.0)</p>
      </footer>
    </div>
  )
}
