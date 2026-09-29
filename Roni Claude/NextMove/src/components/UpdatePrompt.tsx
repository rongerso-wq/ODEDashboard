import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import './UpdatePrompt.css'

/**
 * Offline support + updates. When a new version has been downloaded it waits for the player to
 * tap "Update" (never reloads by itself, so a game in progress is never interrupted).
 */
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    // The browser only looks for a new version on a full page load, and iOS rarely reloads a
    // home-screen app: it just wakes it up. So also look whenever the app comes back on screen.
    onRegisteredSW(_url, reg) {
      if (!reg) return
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && navigator.onLine) reg.update().catch(() => {})
      })
    },
  })

  // "Ready to work offline" is good news, not a question: it disappears on its own.
  useEffect(() => {
    if (!offlineReady) return
    const t = setTimeout(() => setOfflineReady(false), 5000)
    return () => clearTimeout(t)
  }, [offlineReady, setOfflineReady])

  if (!needRefresh && !offlineReady) return null
  return (
    <div className="update-toast" role="status" aria-live="polite">
      {needRefresh ? (
        <>
          <span>A new version of NextMove is ready.</span>
          <button className="btn btn-primary" onClick={() => updateServiceWorker(true)}>
            Update
          </button>
          <button className="btn btn-ghost" onClick={() => setNeedRefresh(false)}>
            Later
          </button>
        </>
      ) : (
        <span>✓ NextMove is ready to work without internet.</span>
      )}
    </div>
  )
}
