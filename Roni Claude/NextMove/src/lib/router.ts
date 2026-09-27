import { useEffect, useState } from 'react'

// Tiny hash router: '#/play/local' -> '/play/local'. Hash routes work on any static host and offline.
function current(): string {
  return window.location.hash.replace(/^#/, '') || '/'
}

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

export function navigate(to: string): void {
  window.location.hash = to
}
