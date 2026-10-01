import type { Feedback, Hint } from '../coach/explain'
import type { Grade } from '../coach/grade'
import type { Comment } from '../coach/commentary'
import { IconBulb } from './Icons'
import { EliasAvatar } from './Elias'
import { useSay, useSpeaking } from '../lib/useVoice'
import { notationToWords } from '../lib/speakable'
import './CoachCard.css'

const GRADE_BADGE: Record<Grade, string> = { best: '★', good: '✓', inaccuracy: '?!', mistake: '?', blunder: '??' }

/** A grade badge: coloured circle with ★ ✓ ?! ? ?? */
export function GradeBadge({ grade, size = 34 }: { grade: Grade; size?: number }) {
  return (
    <span className={`grade-badge g-${grade}`} style={{ width: size, height: size, fontSize: Math.max(12, size * 0.46) }} aria-hidden="true">
      {GRADE_BADGE[grade]}
    </span>
  )
}

type Props = {
  kids: boolean
  enabled: boolean
  onToggle: (on: boolean) => void
  feedback: Feedback | null
  pending: boolean
  hint: Hint | null
  hintLoading: boolean
  /** hints are off in clock games */
  canHint: boolean
  onHint: () => void
  /** only in games that allow take-backs */
  onTryAgain?: () => void
  onShowBetter?: () => void
  myTurn: boolean
  /** Elias on the opponent's last move (null for quiet moves) */
  commentary?: { san: string; ply: number; comment: Comment } | null
  opponent?: string
}

export default function CoachCard(p: Props) {
  const speaking = useSpeaking()
  // Elias says each verdict, then his comment on the reply (queued so neither cuts the other off);
  // a hint interrupts, because the player asked for it.
  // He speaks the fixed `say` sentences (recorded in his own voice); the card shows the detail.
  useSay(p.enabled && p.feedback ? `${p.feedback.title}. ${p.feedback.say}` : null, p.feedback ? `${p.feedback.san}:${p.feedback.after}` : undefined, {
    queue: true,
  })
  useSay(p.enabled && p.commentary ? p.commentary.comment.say : null, p.commentary?.ply, { queue: true })
  useSay(p.hint?.say)
  const bad = p.feedback && (p.feedback.grade === 'inaccuracy' || p.feedback.grade === 'mistake' || p.feedback.grade === 'blunder')
  const shown = (text: string) => (p.kids ? notationToWords(text) : text) // Kids: no "Nf3", words instead
  const hintLabel = p.hint ? (p.hint.level < 3 ? 'Next hint' : 'Hint shown') : p.kids ? 'Help me!' : 'Hint'

  return (
    <section className="coach" aria-label="Coach">
      <header className="coach-head">
        <span className="coach-title">
          <EliasAvatar size={34} speaking={speaking} /> Elias · Coach
        </span>
        <label className="switch">
          <input type="checkbox" checked={p.enabled} onChange={(e) => p.onToggle(e.target.checked)} />
          <span className="switch-track" aria-hidden="true" />
          <span className="sr-only">Coach on</span>
        </label>
      </header>

      <div className="coach-body" aria-live="polite">
        {p.hint ? (
          <div className="coach-hint">
            <span className="hint-step">Hint {p.hint.level} of 3</span>
            <p>{shown(p.hint.text)}</p>
          </div>
        ) : p.enabled && p.pending ? (
          <p className="coach-wait">{p.kids ? 'Let me look at your move…' : 'Looking at your move…'}</p>
        ) : p.enabled && p.feedback ? (
          <div className={`coach-feedback g-${p.feedback.grade}`}>
            <GradeBadge grade={p.feedback.grade} />
            <div>
              {/* Kids never see chess notation ("Nf3"): just the verdict */}
              <strong>{p.kids ? p.feedback.title : `${p.feedback.san} — ${p.feedback.title}`}</strong>
              <p>{shown(p.feedback.text)}</p>
              {(p.feedback.grade === 'mistake' || p.feedback.grade === 'blunder') && p.feedback.bestSan && (
                <span className="saved-note">📌 {p.kids ? 'Saved to your oops moments to practise later' : 'Saved to My mistakes for practice'}</span>
              )}
            </div>
          </div>
        ) : (
          <p className="coach-idle">
            {!p.enabled
              ? 'The coach is off. Turn it on to see how good each move is.'
              : p.kids
                ? "I'm Elias. I'll tell you how each move went. Stuck? Tap Help me!"
                : "I'm Elias, your coach. I'll grade each of your moves, explain the mistakes and tell you what your opponent is up to. Stuck? Ask for a hint."}
          </p>
        )}
        {p.enabled && p.commentary && !p.hint && (
          <div key={p.commentary.ply} className={`coach-comment t-${p.commentary.comment.tone}`}>
            <span className="comment-label">
              {p.kids ? (
                <>{p.opponent}&apos;s move</>
              ) : (
                <>
                  {p.opponent} played <b>{p.commentary.san}</b>
                </>
              )}
            </span>
            <p>{shown(p.commentary.comment.text)}</p>
          </div>
        )}
      </div>

      <div className="coach-actions">
        {bad && p.enabled && !p.hint && p.onTryAgain && (
          <>
            <button className="btn btn-primary" onClick={p.onTryAgain}>
              Try again
            </button>
            <button className="btn" onClick={p.onShowBetter}>
              Show the better move
            </button>
          </>
        )}
        {p.canHint && p.myTurn && !(bad && p.enabled && !p.hint && p.onTryAgain) && (
          <button className="btn hint-btn" onClick={p.onHint} disabled={p.hintLoading || p.hint?.level === 3}>
            <IconBulb /> {p.hintLoading ? 'Thinking…' : hintLabel}
          </button>
        )}
      </div>
    </section>
  )
}
