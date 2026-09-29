import { useMemo } from 'react'
import { IconArrow, IconBack } from '../components/Icons'
import { ALL_LESSONS, CHAPTERS } from '../academy/lessons'
import { chapterDone, loadProgress, nextLessonId } from '../academy/progress'
import { pieceUrl } from '../chess/pieces'
import { navigate } from '../lib/router'
import { useSettings } from '../lib/settings'
import { Narrator, VoiceToggle } from '../components/Elias'
import { sayAcademy } from '../coach/say'
import './Academy.css'

/** The Academy map: chapters as winding paths of lessons, with stars and chapter badges. */
export default function Academy() {
  const { mode } = useSettings()
  const kids = mode === 'kids'
  const progress = useMemo(() => loadProgress(), [])
  const nextId = nextLessonId(progress)
  const next = ALL_LESSONS.find((l) => l.id === nextId)
  const earned = Object.values(progress).reduce((a, b) => a + b, 0)
  const possible = ALL_LESSONS.length * 3
  const badges = CHAPTERS.filter((c) => chapterDone(c.id, progress))

  return (
    <div className="page academy">
      <header className="topbar">
        <div className="brand">
          <button className="icon-btn" onClick={() => navigate('/')} aria-label="Back to home">
            <IconBack />
          </button>
          <h1 className="screen-title">Academy</h1>
        </div>
        <div className="topbar-actions">
          <div className="star-total" role="img" aria-label={`${earned} of ${possible} stars`}>
            ★ {earned}
            <span>/{possible}</span>
          </div>
          <VoiceToggle />
        </div>
      </header>

      <div className="academy-elias">
        <Narrator
          compact
          text={
            !earned
              ? kids
                ? "Hello, young friend! I'm Elias. I have played chess for seventy years, and I will teach you everything I know. Let's start with how the pieces move!"
                : "Welcome. I'm Elias, and I'll be your teacher. We start with how the pieces move and finish with real endgame technique. Take your time — every lesson is played on the board."
              : next
                ? kids
                  ? `Welcome back! You have ${earned} stars already. Next up: ${next.title}.`
                  : `Welcome back. ${earned} stars so far. Next: ${next.title} — ${next.about}`
                : kids
                  ? 'You finished every lesson! Now try to win three stars on each one.'
                  : 'You have completed the Academy. Replay any lesson to polish it to three stars.'
          }
          // spoken without the lesson's subtitle, as recorded sentences (coach/say.ts)
          speakText={earned && next ? `${kids ? 'Welcome back!' : 'Welcome back.'} ${sayAcademy.stars(earned)} ${sayAcademy.nextUp(next.title)}` : undefined}
        />
      </div>

      <section className="academy-hero" style={{ ['--hue' as string]: next?.chapter.hue ?? 45 }}>
        <div>
          <p className="eyebrow">{next ? (earned ? (kids ? 'Keep going!' : 'Continue learning') : kids ? 'Start here!' : 'Start here') : 'All lessons done'}</p>
          <h2>{next ? (kids && next.kidsTitle ? next.kidsTitle : next.title) : kids ? 'You finished everything! 🏆' : 'You completed the Academy'}</h2>
          <p className="muted">
            {next
              ? next.about
              : kids
                ? 'Go back and win three stars on every lesson!'
                : 'Replay lessons to earn three stars on each one.'}
          </p>
        </div>
        {next && (
          <button className="btn btn-primary" onClick={() => navigate(`/learn/${next.id}`)}>
            {earned ? 'Continue' : kids ? "Let's go!" : 'Begin'} <IconArrow />
          </button>
        )}
      </section>

      {badges.length > 0 && (
        <section className="badges" aria-label="Badges">
          {badges.map((c) => (
            <span key={c.id} className="badge" style={{ ['--hue' as string]: c.hue }} title={`Completed: ${c.title}`}>
              🏅 {kids && c.kidsTitle ? c.kidsTitle : c.title}
            </span>
          ))}
        </section>
      )}

      {CHAPTERS.map((c, ci) => {
        const done = c.lessons.filter((l) => progress[l.id]).length
        return (
          <section key={c.id} className="chapter" style={{ ['--hue' as string]: c.hue }}>
            <header className="chapter-head">
              <span className="chapter-num">{ci + 1}</span>
              <div>
                <h2>{kids && c.kidsTitle ? c.kidsTitle : c.title}</h2>
                <p className="muted">{c.about}</p>
              </div>
              <span className={`chapter-count${done === c.lessons.length ? ' complete' : ''}`}>
                {done === c.lessons.length ? '🏅' : `${done}/${c.lessons.length}`}
              </span>
            </header>
            <ol className="path">
              {c.lessons.map((l, li) => {
                const stars = progress[l.id] ?? 0
                return (
                  <li key={l.id} className={`node-wrap w${li % 4}`}>
                    <button
                      className={`node${stars ? ' done' : ''}${l.id === nextId ? ' next' : ''}`}
                      onClick={() => navigate(`/learn/${l.id}`)}
                      aria-label={`${l.title}${stars ? `, ${stars} of 3 stars` : ''}`}
                    >
                      <span className="node-disc">
                        <img src={pieceUrl({ type: l.piece, color: 'w' })} alt="" />
                      </span>
                      <span className="node-title">{kids && l.kidsTitle ? l.kidsTitle : l.title}</span>
                      <span className="node-stars" aria-hidden="true">
                        {[1, 2, 3].map((n) => (
                          <i key={n} className={n <= stars ? 'on' : ''}>
                            ★
                          </i>
                        ))}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </section>
        )
      })}
    </div>
  )
}
