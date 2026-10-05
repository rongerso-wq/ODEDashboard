import { useRef, useState } from 'react'
import { exportProgress, importProgress } from '../lib/storage'

/**
 * Settings › Your progress: backup and restore. Progress lives only on this device, and a browser
 * can clear it (or a phone gets replaced); a file keeps it safe (QA 2026-10-01).
 * Its own file: nothing here is spoken, so the voice collector (scripts/voice) doesn't scan it.
 */
export default function ProgressBackup() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<string | null>(null) // a chosen backup, waiting for "Restore"
  const [note, setNote] = useState<string | null>(null)

  async function save() {
    const name = `nextmove-backup-${new Date().toISOString().slice(0, 10)}.json`
    const file = new File([exportProgress()], name, { type: 'application/json' })
    // Phones: the share sheet (Save to Files, Drive, email). Elsewhere: a download.
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'NextMove backup' })
        setNote('Backup saved.')
        return
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
      }
    }
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    setNote('Backup file downloaded.')
  }

  function chosen(f: File | undefined) {
    if (!f) return
    f.text().then(setPending, () => setNote('That file could not be read.'))
    if (fileRef.current) fileRef.current.value = '' // the same file can be chosen again
  }

  function restore() {
    if (!pending) return
    const r = importProgress(pending)
    setPending(null)
    if ('error' in r) setNote(r.error)
    else window.location.reload() // every screen reads the restored progress afresh
  }

  return (
    <section className="sheet-install">
      <strong>Your progress</strong>
      <p className="sheet-note">
        Lessons, games, puzzles and mistakes are saved only on this device. Save a backup file to keep them safe, or to
        move them to another phone or computer.
      </p>
      <div className="sheet-backup">
        <button className="btn" onClick={() => void save()}>
          Save a backup
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          Restore a backup
        </button>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => chosen(e.target.files?.[0])} />
      </div>
      {pending && (
        <div className="sheet-confirm" role="alert">
          <span>Replace the progress on this device with the backup?</span>
          <button className="btn btn-primary" onClick={restore}>
            Restore
          </button>
          <button className="btn btn-ghost" onClick={() => setPending(null)}>
            Cancel
          </button>
        </div>
      )}
      {note && <p className="sheet-note">{note}</p>}
    </section>
  )
}
