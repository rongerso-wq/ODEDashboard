import { useSettings } from '../lib/settings'

/** Classic / Kids segmented switch. Kids mode: brighter, bigger, friendlier words. */
export default function ModeSwitch() {
  const { mode, update } = useSettings()
  return (
    <div className="mode-switch" role="radiogroup" aria-label="App style">
      {(['classic', 'kids'] as const).map((m) => (
        <button key={m} role="radio" aria-checked={mode === m} className={mode === m ? 'on' : ''} onClick={() => update({ mode: m })}>
          {m === 'classic' ? 'Classic' : 'Kids'}
        </button>
      ))}
    </div>
  )
}
