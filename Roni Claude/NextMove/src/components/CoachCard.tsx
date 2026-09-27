import type { Feedback, Hint } from '../coach/explain'
import type { Grade } from '../coach/grade'
import type { Comment } from '../coach/commentary'
import { IconBulb } from './Icons'
import { EliasAvatar } from './Elias'
import { useSay, useSpeaking } from '../lib/useVoice'
import './CoachCard.css'

const GRADE_BADGE: Record<Grade, string> = { best: '★', good: '✓', inaccuracy: '?!', mistake: '?', blunder: '??' }

/** A grade badge: coloured circle with ★ ✓ ?! ? ?? */
export function GradeBadge({ grade, size = 34 }: { grade: Grade; size?: number }) {
  return (
    <span className={`grade-badge g-${grade}`} style={{ width: size, height: size, fontSize: size * 0.46 }} aria-hidden="true">
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
  const san = p.feedback?.san ?? ''
  const spokenSan = /^[a-h][1-8][+#]?$/.test(san) ? `Pawn to ${san}` : san // "g6" alone sounds unclear
  useSay(p.enabled && p.feedback ? `${spokenSan}. ${p.feedback.title}. ${p.feedback.text}` : null, undefined, { queue: true })
  useSay(p.enabled && p.commentary ? p.commentary.comment.text : null, p.commentary?.ply, { queue: true })
  useSay(p.hint?.text)
  const bad = p.feedback && (p.feedback.grade === 'inaccuracy' || p.feedback.grade === 'mistake' || p.feedback.grade === 'blunder')
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
            <p>{p.hint.text}</p>
          </div>
        ) : p.enabled && p.pending ? (
          <p className="coach-wait">{p.kids ? 'Let me look at your move…' : 'Looking at your move…'}</p>
        ) : p.enabled && p.feedback ? (
          <div className={`coach-feedback g-${p.feedback.grade}`}>
            <GradeBadge grade={p.feedback.grade} />
            <div>
              <strong>
                {p.feedback.san} — {p.feedback.title}
              </strong>
              <p>{p.feedback.text}</p>
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
              {p.opponent} played <b>{p.commentary.san}</b>
            </span>
            <p>{p.commentary.comment.text}</p>
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
