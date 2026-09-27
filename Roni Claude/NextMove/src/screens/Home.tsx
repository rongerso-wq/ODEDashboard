import { useState, type ReactNode } from 'react'
import { IconArrow, IconBook, IconCpu, IconGlobe, IconPuzzle, IconGear, IconUsers, Logo } from '../components/Icons'
import ModeSwitch from '../components/ModeSwitch'
import { navigate } from '../lib/router'
import { useSettings } from '../lib/settings'
import Board from '../components/Board'
import { EliasAvatar } from '../components/Elias'
import SettingsSheet from '../components/SettingsSheet'
import './Home.css'

const HERO_FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3'

type Card = {
  id: string
  icon: ReactNode
  title: string
  kids: string
  classic: string
  to?: string // missing = not built yet
}

const CARDS: Card[] = [
  {
    id: 'learn',
    icon: <IconBook />,
    title: 'Academy',
    classic: 'From how the pieces move to openings and endgames — every lesson played on the board.',
    kids: 'Learn how every piece moves with fun board games and win stars!',
    to: '/learn',
  },
  {
    id: 'computer',
    icon: <IconCpu />,
    title: 'Play the Computer',
    classic: 'Eight opponents from absolute beginner to grandmaster, with a coach at your side.',
    kids: 'Play against eight friendly characters — from super easy to super hard.',
    to: '/play/computer',
  },
  {
    id: 'friend',
    icon: <IconUsers />,
    title: 'Play a Friend',
    classic: 'Two players, one device. Pass and play.',
    kids: 'Play with someone next to you on the same screen.',
    to: '/play/local',
  },
  {
    id: 'puzzles',
    icon: <IconPuzzle />,
    title: 'Puzzles',
    classic: 'Daily puzzle, themed sets and Puzzle Rush.',
    kids: 'Find the winning move — can you solve them all?',
    to: '/puzzles',
  },
  {
    id: 'online',
    icon: <IconGlobe />,
    title: 'Play Online',
    classic: 'Rated games against players around the world.',
    kids: 'Play chess with kids from all over the world.',
  },
]

export default function Home() {
  const { mode } = useSettings()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const kids = mode === 'kids'
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
          <p className="eyebrow">{kids ? 'Hi there, future champion!' : 'Chess for every age, 0 to 100'}</p>
          <h1>{kids ? "Let's learn chess together!" : 'Learn the game. Then master it.'}</h1>
          <p className="lede">
            {kids
              ? 'Learn how the pieces move, play fun games and get a little smarter every time.'
              : 'A coach that shows you why, not just what. Free lessons, friendly opponents and real games — no ads, nothing locked.'}
          </p>
          <p className="meet-elias">
            <EliasAvatar size={46} />
            <span>
              {kids ? (
                <>
                  Meet <strong>Elias</strong>, your chess grandpa. He explains every move out loud!
                </>
              ) : (
                <>
                  Your teacher, <strong>Elias</strong>, explains every lesson, hint and mistake out loud.
                </>
              )}
            </span>
          </p>
          <div className="hero-ctas">
            <button className="btn btn-primary hero-cta" onClick={() => navigate('/learn')}>
              {kids ? "Let's learn!" : 'Start learning'} <IconArrow />
            </button>
            <button className="btn hero-cta" onClick={() => navigate('/play/computer')}>
              {kids ? 'Play a game' : 'Play a game'}
            </button>
          </div>
        </div>
        <div className="hero-board" aria-hidden="true">
          {/* The Italian Game — the opening most beginners learn first. */}
          <Board fen={HERO_FEN} lastMove={{ from: 'f1', to: 'c4' }} animate={false} coordinates={false} />
        </div>
      </section>

      <nav className="cards" aria-label="Main menu">
        {CARDS.map((c) => (
          <button
            key={c.id}
            className={`card card-${c.id}`}
            disabled={!c.to}
            onClick={() => c.to && navigate(c.to)}
          >
            <span className="card-icon">{c.icon}</span>
            <span className="card-body">
              <span className="card-title">
                {c.title}
                {!c.to && <span className="soon">Coming soon</span>}
              </span>
              <span className="card-text">{kids ? c.kids : c.classic}</span>
            </span>
            {c.to && <IconArrow className="card-go" />}
          </button>
        ))}
      </nav>

      <footer className="home-foot">
        Pieces: cburnett (CC BY-SA 3.0). Free forever — no ads.
      </footer>
    </div>
  )
}
