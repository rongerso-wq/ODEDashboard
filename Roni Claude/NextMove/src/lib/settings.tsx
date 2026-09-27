import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { load, save } from './storage'
import { setSoundEnabled } from './sound'
import { setVoiceEnabled, setVoiceName } from './voice'

export type Mode = 'classic' | 'kids'

export type Settings = {
  mode: Mode
  sound: boolean
  coordinates: boolean
  /** live coach in games without a clock */
  coach: boolean
  /** Elias reads explanations aloud */
  voice: boolean
  /** chosen speech voice (null = pick the best available) */
  voiceName: string | null
}

const DEFAULTS: Settings = { mode: 'classic', sound: true, coordinates: true, coach: true, voice: true, voiceName: null }

type Ctx = Settings & { update: (patch: Partial<Settings>) => void }

const SettingsContext = createContext<Ctx | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => ({ ...DEFAULTS, ...load('settings', {}) }))

  useEffect(() => {
    document.documentElement.dataset.mode = settings.mode
    setSoundEnabled(settings.sound)
    setVoiceEnabled(settings.voice)
    setVoiceName(settings.voiceName)
    save('settings', settings)
  }, [settings])

  const update = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }))

  return <SettingsContext.Provider value={{ ...settings, update }}>{children}</SettingsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings(): Ctx {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider')
  return ctx
}
