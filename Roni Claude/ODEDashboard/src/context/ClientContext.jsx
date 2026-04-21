import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ensureSeed, loadState, patchState, saveState } from '../lib/storage.js'

const ClientContext = createContext(null)

export function ClientProvider({ children }) {
  const [state, setState] = useState(() => {
    const initial = ensureSeed()
    return initial ?? loadState()
  })

  // Persist whenever state changes
  useEffect(() => {
    if (state) {
      saveState(state)
    }
  }, [state])

  const setSelectedClientId = useCallback((id) => {
    setState((prev) => ({ ...prev, selectedClientId: id ?? null }))
  }, [])

  const selectedClient = useMemo(
    () => state?.clients?.find((c) => c.id === state?.selectedClientId) ?? null,
    [state],
  )

  const value = useMemo(
    () => ({
      state,
      setState,
      clients: state?.clients ?? [],
      posts: state?.posts ?? [],
      campaigns: state?.campaigns ?? [],
      activity: state?.activity ?? [],
      selectedClientId: state?.selectedClientId ?? null,
      selectedClient,
      setSelectedClientId,
    }),
    [state, selectedClient, setSelectedClientId],
  )

  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>
}

export function useAppState() {
  const ctx = useContext(ClientContext)
  if (!ctx) throw new Error('useAppState must be used within ClientProvider')
  return ctx
}
