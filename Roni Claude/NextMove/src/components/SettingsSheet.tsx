import { useEffect, useRef, useState } from 'react'
import ModeSwitch from './ModeSwitch'
import { EliasAvatar } from './Elias'
import { useSpeaking } from '../lib/useVoice'
import { useSettings } from '../lib/settings'
import { englishVoices, pickVoice, speak, voiceSupported, whenVoicesReady } from '../lib/voice'
import { canPromptInstall, isInstalled, isIOS, onInstallChange, promptInstall } from '../lib/install'
import './SettingsSheet.css'

const SAMPLE =
  "Hello, my friend. I'm Elias. Before every move, look at every check, capture and threat. Remember Scholar's mate: Qxf7# works only when the bishop helps."

/** Install NextMove as an app: a real prompt on Chrome/Edge/Android, instructions on iPhone. */
function InstallRow() {
  const [, rerender] = useState(0)
  useEffect(() => onInstallChange(() => rerender((n) => n + 1)), [])
  let body
  if (isInstalled()) body = <p className="sheet-note">✓ Installed. NextMove opens like an app and works offline.</p>
  else if (canPromptInstall())
    body = (
      <button className="btn btn-primary" onClick={() => void promptInstall()}>
        Install NextMove
      </button>
    )
  else if (isIOS())
    body = (
      <p className="sheet-note">
        On iPhone or iPad: tap <strong>Share</strong> (the square with the arrow), then <strong>Add to Home Screen</strong>.
      </p>
    )
  else
    body = (
      <p className="sheet-note">
        Open your browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.
      </p>
    )
  return (
    <section className="sheet-install">
      <strong>Install as an app</strong>
      <span className="sheet-note">Put NextMove on your home screen. It works without internet.</span>
      {body}
    </section>
  )
}

export default function SettingsSheet({ onClose }: { onClose: () => void }) {
  const s = useSettings()
  const speaking = useSpeaking()
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => whenVoicesReady(() => setVoices(englishVoices())), [])
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const auto = s.voiceName ? null : pickVoice(voices) // what "Automatic" currently resolves to

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div className="dialog sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <h2 id="settings-title">Settings</h2>
          <button ref={closeRef} className="btn btn-ghost" onClick={onClose}>
            Done
          </button>
        </header>

        <div className="sheet-row">
          <span>Style</span>
          <ModeSwitch />
        </div>
        <label className="sheet-row">
          <span>Sound effects</span>
          <input type="checkbox" checked={s.sound} onChange={(e) => s.update({ sound: e.target.checked })} />
        </label>
        <label className="sheet-row">
          <span>Show square names (a–h, 1–8)</span>
          <input type="checkbox" checked={s.coordinates} onChange={(e) => s.update({ coordinates: e.target.checked })} />
        </label>

        <InstallRow />

        <section className="sheet-voice">
          <div className="sheet-voice-head">
            <EliasAvatar size={56} speaking={speaking} />
            <div>
              <strong>Elias's voice</strong>
              <p>Your teacher reads lessons, hints and explanations aloud.</p>
            </div>
          </div>
          {!voiceSupported() ? (
            <p className="sheet-note">This browser can't speak. Try Chrome, Edge or Safari.</p>
          ) : (
            <>
              <label className="sheet-row">
                <span>Elias speaks</span>
                <input type="checkbox" checked={s.voice} onChange={(e) => s.update({ voice: e.target.checked })} />
              </label>
              <label className="sheet-field">
                <span>Voice</span>
                <select value={s.voiceName ?? ''} onChange={(e) => s.update({ voiceName: e.target.value || null })}>
                  <option value="">Automatic{auto ? ` (${auto.name})` : ''}</option>
                  {voices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn" onClick={() => speak(SAMPLE, { force: true })}>
                🔊 Hear Elias
              </button>
              <p className="sheet-note">
                Voices come from your device, so they differ between phones and computers. On Windows, Microsoft Edge has
                the most natural ones.
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
