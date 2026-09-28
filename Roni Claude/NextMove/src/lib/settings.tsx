import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { isObj, load, save } from './storage'
import { setSoundEnabled } from './sound'
import { setRecordedVoice, setVoiceEnabled, setVoiceName } from './voice'

export type Mode = 'classic' | 'kids'

export type Settings = {
  mode: Mode
  sound: boolean
  coordinates: boolean
  /** live coach in games without a clock */
  coach: boolean
  /** Elias reads explanations aloud */
  voice: boolean
  /** chosen device voice (a voiceURI; null = pick the best available) */
  voiceName: string | null
  /** 'recorded': Elias's own recorded voice; 'device': the device's speech voices */
  eliasVoice: 'recorded' | 'device'
}

const DEFAULTS: Settings = { mode: 'classic', sound: true, coordinates: true, coach: true, voice: true, voiceName: null, eliasVoice: 'recorded' }

type Ctx = Settings & { update: (patch: Partial<Settings>) => void }

const SettingsContext = createContext<Ctx | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => ({ ...DEFAULTS, ...load('settings', {}, isObj) }))

  useEffect(() => {
    document.documentElement.dataset.mode = settings.mode
    setSoundEnabled(settings.sound)
    setVoiceEnabled(settings.voice)
    setVoiceName(settings.voiceName)
    setRecordedVoice(settings.eliasVoice !== 'device')
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
