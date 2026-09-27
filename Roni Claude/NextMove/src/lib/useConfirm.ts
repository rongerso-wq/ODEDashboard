import { useEffect, useState } from 'react'

/** "Tap again to confirm" for risky buttons (resign, new game). The pending tap expires after 3.5 s. */
export function useConfirm<T extends string>() {
  const [pending, setPending] = useState<T | null>(null)

  useEffect(() => {
    if (!pending) return
    const t = setTimeout(() => setPending(null), 3500)
    return () => clearTimeout(t)
  }, [pending])

  function ask(action: T, run: () => void) {
    if (pending === action) {
      setPending(null)
      run()
    } else setPending(action)
  }

  return { pending, ask }
}
