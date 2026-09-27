import { speak, stop } from '../lib/voice'
import { useSettings } from '../lib/settings'
import { useSay, useSpeaking } from '../lib/useVoice'
import './Elias.css'

/** Elias: an old grandmaster with a white beard, round glasses and a bow tie. */
export function EliasAvatar({ size = 48, speaking = false }: { size?: number; speaking?: boolean }) {
  return (
    <span className={`elias${speaking ? ' speaking' : ''}`} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 64 64">
        <defs>
          <radialGradient id="elias-bg" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#f6e2b8" />
            <stop offset="100%" stopColor="#c9964f" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="32" fill="url(#elias-bg)" />
        {/* tweed jacket + collar + bow tie */}
        <path d="M8 64c2-11 11-16 24-16s22 5 24 16z" fill="#5b3f2a" />
        <path d="M24 49l8 9 8-9-8-2z" fill="#f4efe6" />
        <path d="M27 53l5 2 5-2-1 4-4-1-4 1z" fill="#8c2f2f" />
        {/* ears */}
        <ellipse cx="17.5" cy="30" rx="2.6" ry="4" fill="#e9b894" />
        <ellipse cx="46.5" cy="30" rx="2.6" ry="4" fill="#e9b894" />
        {/* head */}
        <ellipse cx="32" cy="28" rx="14" ry="16" fill="#f3cda9" />
        {/* white hair at the sides */}
        <path d="M18 27c-1-6 1-11 4-13-1 4-1 8 0 12z" fill="#f2f0ea" />
        <path d="M46 27c1-6-1-11-4-13 1 4 1 8 0 12z" fill="#f2f0ea" />
        {/* bushy eyebrows */}
        <path d="M22 22.5c2.5-2 6-2.2 8-0.8" stroke="#f7f5f0" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <path d="M34 21.7c2-1.4 5.5-1.2 8 0.8" stroke="#f7f5f0" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        {/* eyes + round glasses */}
        <circle cx="26.5" cy="27" r="1.3" fill="#3a2a1d" />
        <circle cx="37.5" cy="27" r="1.3" fill="#3a2a1d" />
        <circle cx="26.5" cy="27" r="4.6" fill="rgba(255,255,255,0.18)" stroke="#3b2a1a" strokeWidth="1.3" />
        <circle cx="37.5" cy="27" r="4.6" fill="rgba(255,255,255,0.18)" stroke="#3b2a1a" strokeWidth="1.3" />
        <path d="M31.1 27h1.8" stroke="#3b2a1a" strokeWidth="1.3" />
        {/* nose */}
        <path d="M32 29c-1.6 3-1.8 5-0.2 5.6 1 .4 2 .1 2.4-.4" fill="#e3a987" />
        {/* beard (moves while speaking) */}
        <g className="elias-jaw">
          <path d="M19 33c1 11 6 17 13 17s12-6 13-17c-3 3-7 4-13 4s-10-1-13-4z" fill="#f4f2ec" />
          <path d="M28.5 40.5c1.2 1 5.8 1 7 0" stroke="#b9876a" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        </g>
        {/* moustache */}
        <path d="M24 37c3-3.5 6-3 8-1.3 2-1.7 5-2.2 8 1.3-3 1-5.5.7-8-.6-2.5 1.3-5 1.6-8 .6z" fill="#ffffff" />
      </svg>
    </span>
  )
}

/** Elias's speech bubble: portrait, text, and a replay button. Speaks the text when it changes. */
export function Narrator({ text, speakText, compact = false }: { text: string; speakText?: string; compact?: boolean }) {
  const speaking = useSpeaking()
  const { voice } = useSettings()
  useSay(speakText ?? text)
  return (
    <div className={`narrator${compact ? ' compact' : ''}`}>
      <EliasAvatar size={compact ? 40 : 52} speaking={speaking} />
      <div className="narrator-body">
        <span className="narrator-name">Elias</span>
        <p>{text}</p>
      </div>
      <button
        className="narrator-replay"
        onClick={() => (speaking ? stop() : speak(speakText ?? text, { force: true }))}
        aria-label={speaking ? 'Stop Elias' : 'Hear Elias say it again'}
        title={voice ? undefined : 'Elias is muted — tap to hear this once'}
      >
        {speaking ? '■' : '🔊'}
      </button>
    </div>
  )
}

/** Top-bar switch: Elias's voice on/off. */
export function VoiceToggle() {
  const { voice, update } = useSettings()
  const speaking = useSpeaking()
  return (
    <button
      className={`icon-btn voice-toggle${voice ? '' : ' off'}`}
      onClick={() => update({ voice: !voice })}
      aria-label={voice ? "Mute Elias's voice" : "Turn on Elias's voice"}
      aria-pressed={voice}
      title={voice ? 'Elias is speaking' : 'Elias is muted'}
    >
      <EliasAvatar size={34} speaking={speaking && voice} />
    </button>
  )
}
