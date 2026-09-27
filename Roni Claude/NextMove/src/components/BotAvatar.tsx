import type { Bot } from '../engine/bots'
import { pieceUrl } from '../chess/pieces'
import './BotAvatar.css'

export function BotAvatar({ bot, size = 40 }: { bot: Bot; size?: number }) {
  return (
    <span
      className="bot-avatar"
      style={{ width: size, height: size, ['--hue' as string]: bot.hue }}
      aria-hidden="true"
    >
      <img src={pieceUrl({ type: bot.piece, color: 'w' })} alt="" />
      {bot.level >= 6 && <span className="bot-crown" />}
    </span>
  )
}

/** The bot's chat line, as a speech bubble next to its avatar. */
export function BotSays({ bot, text }: { bot: Bot; text: string }) {
  return (
    <div className="bot-says">
      <BotAvatar bot={bot} size={44} />
      <p key={text} className="bubble" aria-live="polite">
        <strong>{bot.name}</strong>
        {text}
      </p>
    </div>
  )
}
