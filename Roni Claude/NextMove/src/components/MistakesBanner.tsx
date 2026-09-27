import { useMemo } from 'react'
import { EliasAvatar } from './Elias'
import { IconArrow } from './Icons'
import { deckStats } from '../mistakes/deck'
import { navigate } from '../lib/router'
import '../screens/Mistakes.css'

/** "N mistakes to practise" — shown only when cards are due. */
export default function MistakesBanner({ kids }: { kids: boolean }) {
  const { due } = useMemo(() => deckStats(), [])
  if (!due) return null
  return (
    <button className="mk-banner" onClick={() => navigate('/mistakes')}>
      <EliasAvatar size={44} />
      <div>
        <strong>
          {kids
            ? `${due} oops ${due === 1 ? 'moment' : 'moments'} to fix!`
            : `${due} ${due === 1 ? 'mistake' : 'mistakes'} to practise`}
        </strong>
        <span>{kids ? 'Let’s practise them together so they never happen again.' : 'From your own games, back until you have them right.'}</span>
      </div>
      <IconArrow />
    </button>
  )
}
