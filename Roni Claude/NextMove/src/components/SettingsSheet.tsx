import { useEffect, useRef, useState } from 'react'
import ModeSwitch from './ModeSwitch'
import { EliasAvatar } from './Elias'
import { useSpeaking } from '../lib/useVoice'
import { useSettings } from '../lib/settings'
import { bestVoice, englishVoices, speak, voiceId, voiceLabel, voiceSupported, whenVoicesReady } from '../lib/voice'
import { canPromptInstall, isInstalled, isIOS, onInstallChange, promptInstall } from '../lib/install'
import { clipTotal, downloadAll, offlineCount, voiceMb } from '../lib/recordings'
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

/** Elias's recorded voice without internet: lines he has said are kept; this stores all of them. */
function OfflineVoice() {
  const [have, setHave] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let live = true
    void offlineCount().then((n) => live && setHave(n))
    return () => {
      live = false
    }
  }, [])
  const ready = have === clipTotal
  async function download() {
    setBusy(true)
    const n = await downloadAll(setHave)
    setHave(n)
    setBusy(false)
  }
  return (
    <>
      <p className="sheet-note">
        Elias's own voice, recorded for NextMove.{' '}
        {ready
          ? 'All of it is saved on this device, so he speaks without internet too.'
          : 'Lines he has spoken are kept for offline use. Download the rest to hear him everywhere without internet.'}
      </p>
      {!ready && (
        <button className="btn" onClick={download} disabled={busy || have === null}>
          {busy ? `Downloading… ${Math.round(((have ?? 0) / clipTotal) * 100)}%` : `Download Elias's voice (${voiceMb} MB)`}
        </button>
      )}
    </>
  )
}

/** How to get a more natural voice for Elias on this kind of device (phone voices can sound robotic). */
function voiceTip(): string {
  const ua = navigator.userAgent
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  if (ios)
    return 'Voices come from your iPhone. Apple gives web apps only its basic voices, even when a better one is downloaded, so Elias sounds simpler on iPhone than on a computer.'
  if (/Android/.test(ua))
    return 'Voices come from your phone. For a more natural Elias: search your phone\'s Settings for "Text-to-speech", open the settings of Speech Services by Google, choose Install voice data › English (United Kingdom) and download a voice, then reopen NextMove.'
  return 'Voices come from your device, so they differ between phones and computers. On Windows, Microsoft Edge has the most natural ones.'
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

  const auto = bestVoice(voices) // what "Automatic" resolves to
  const device = s.eliasVoice === 'device'
  // the chosen voice is stored by voiceURI (older versions stored its name)
  const chosen = s.voiceName
    ? (voices.find((v) => voiceId(v) === s.voiceName) ?? voices.find((v) => v.name === s.voiceName))
    : undefined

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
          <label className="sheet-row">
            <span>Elias speaks</span>
            <input type="checkbox" checked={s.voice} onChange={(e) => s.update({ voice: e.target.checked })} />
          </label>
          <label className="sheet-field">
            <span>Voice</span>
            <select
              value={device ? (chosen ? voiceId(chosen) : '') : 'recorded'}
              onChange={(e) =>
                e.target.value === 'recorded'
                  ? s.update({ eliasVoice: 'recorded' })
                  : s.update({ eliasVoice: 'device', voiceName: e.target.value || null })
              }
            >
              <option value="recorded">Elias (recorded voice)</option>
              {voiceSupported() && <option value="">Device voice: Automatic{auto ? ` (${voiceLabel(auto)})` : ''}</option>}
              {voices.map((v) => (
                <option key={voiceId(v)} value={voiceId(v)}>
                  Device voice: {voiceLabel(v)}
                </option>
              ))}
            </select>
          </label>
          <button className="btn" onClick={() => speak(SAMPLE, { force: true })}>
            🔊 Hear Elias
          </button>
          {device ? (
            <>
              <p className="sheet-note">{voiceTip()}</p>
              {/* For support: exactly what the device offers (Enhanced voices hid on a Hebrew iPhone). */}
              <details className="sheet-note voice-details">
                <summary>Voice details</summary>
                <ul>
                  {voices.map((v) => (
                    <li key={voiceId(v)}>
                      {v.name} · {v.lang} · {v.voiceURI}
                      {v.localService ? '' : ' · online'}
                    </li>
                  ))}
                </ul>
              </details>
            </>
          ) : (
            <OfflineVoice />
          )}
        </section>

        {/* Privacy statement and credits (QA L) */}
        <section className="sheet-install">
          <strong>Privacy</strong>
          <p className="sheet-note">
            NextMove has no accounts, no ads and no tracking. Your games, progress and settings stay on this device and are
            never sent anywhere. Elias's recorded voice is part of the app. If you choose a device voice instead, some
            of those are online voices, which send the text being read to your browser's maker.
          </p>
          <strong>Credits</strong>
          <p className="sheet-note">
            Chess engine: Stockfish (GPLv3). Pieces: cburnett by Colin M.L. Burnett (CC BY-SA 3.0). Puzzles: the Lichess
            puzzle database (public domain).
          </p>
          <a className="btn" href="licenses.txt" target="_blank" rel="noreferrer">
            Licences and source code
          </a>
        </section>
      </div>
    </div>
  )
}
