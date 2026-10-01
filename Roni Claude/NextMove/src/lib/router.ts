import { useEffect, useRef, useState } from 'react'

// Tiny hash router: '#/play/local' -> '/play/local'. Hash routes work on any static host and offline.
function current(): string {
  return window.location.hash.replace(/^#/, '') || '/'
}

// Our own history entries remember the screen they came from, so an in-app back arrow can step
// back (like Android's Back) instead of stacking a new entry that Back would then loop through.
type Entry = { prev?: string; sheet?: boolean } | null
const entry = () => window.history.state as Entry

export function useRoute(): string {
  const [route, setRoute] = useState(current)
  useEffect(() => {
    const onChange = () => {
      setRoute(current())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

/**
 * Go to a screen. `replace` swaps the current history entry instead of adding one: for redirects
 * (a game that no longer exists) and for moving sideways (lesson → next lesson), so Back never
 * lands on a screen that only bounces you away again.
 */
export function navigate(to: string, opts: { replace?: boolean } = {}): void {
  if (to === current()) return
  const url = `#${to}`
  if (opts.replace) window.history.replaceState({ prev: entry()?.prev }, '', url)
  else window.history.pushState({ prev: current() }, '', url)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

/** A screen's back arrow: step back if we came from `parent`, otherwise replace this screen with it. */
export function goBack(parent: string): void {
  if (entry()?.prev === parent && !entry()?.sheet) window.history.back()
  else navigate(parent, { replace: true })
}

/**
 * While `open`, a dialog or sheet owns one history entry, so Android's Back closes it instead of
 * leaving the screen (or the app). Closing it from inside the app removes that entry again.
 */
export function useBackToClose(open: boolean, close: () => void): void {
  const closeRef = useRef(close)
  useEffect(() => {
    closeRef.current = close
  })
  useEffect(() => {
    if (!open) return
    let pushed = false
    let popped = false
    // A tick later: React's dev double-run of effects then cancels cleanly instead of
    // pushing, popping and pushing (whose late pop would close the sheet at once).
    const t = setTimeout(() => {
      window.history.pushState({ ...entry(), sheet: true }, '')
      pushed = true
    }, 0)
    const onPop = () => {
      if (!pushed) return
      popped = true
      closeRef.current()
    }
    window.addEventListener('popstate', onPop)
    return () => {
      clearTimeout(t)
      window.removeEventListener('popstate', onPop)
      if (pushed && !popped && entry()?.sheet) window.history.back()
    }
  }, [open])
}
