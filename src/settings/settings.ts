import { useEffect, useState } from 'react'
import { create } from 'zustand'

/**
 * Visitor preferences (sound, time of day), saved in localStorage. Pure data — no three.js —
 * so any UI can read it. 'auto' time of day follows the visitor's local clock.
 */
export type TimeOfDay = 'day' | 'sunset' | 'night'
export type TimeOfDaySetting = TimeOfDay | 'auto'

interface Settings {
  muted: boolean
  /** Master volume 0–1. */
  volume: number
  /** Birds / wind / crickets bed. */
  ambience: boolean
  timeOfDay: TimeOfDaySetting
  /** Multiplayer: be visible to (and see) other visitors. */
  showPresence: boolean
  /** Share photo, location and about with other visitors (opt-in). Name, avatar and tagline are always shown while visible. */
  shareCard: boolean
  /** Show chat messages and bubbles. */
  showChat: boolean
}

interface SettingsState extends Settings {
  set: (patch: Partial<Settings>) => void
}

const KEY = 'campus3d.settings'
const DEFAULTS: Settings = { muted: false, volume: 0.7, ambience: true, timeOfDay: 'day', showPresence: true, shareCard: false, showChat: true }

function load(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return DEFAULTS
  }
}

export const useSettings = create<SettingsState>()((set, get) => ({
  ...load(),
  set: (patch) => {
    set(patch)
    const { muted, volume, ambience, timeOfDay, showPresence, shareCard, showChat } = get()
    try {
      localStorage.setItem(KEY, JSON.stringify({ muted, volume, ambience, timeOfDay, showPresence, shareCard, showChat }))
    } catch {
      // Private mode / storage full: settings just won't persist.
    }
  },
}))

/** The local clock's time of day: 06–17 day, 17–19:30 sunset, otherwise night. */
export function clockTimeOfDay(date = new Date()): TimeOfDay {
  const h = date.getHours() + date.getMinutes() / 60
  if (h >= 6 && h < 17) return 'day'
  if (h >= 17 && h < 19.5) return 'sunset'
  return 'night'
}

export const resolveTimeOfDay = (setting: TimeOfDaySetting): TimeOfDay => (setting === 'auto' ? clockTimeOfDay() : setting)

/** The time of day to show now: the setting, or the local clock (re-checked every minute) for 'auto'. */
export function useTimeOfDay(): TimeOfDay {
  const setting = useSettings((s) => s.timeOfDay)
  const [clock, setClock] = useState(clockTimeOfDay)
  useEffect(() => {
    if (setting !== 'auto') return
    setClock(clockTimeOfDay())
    const id = window.setInterval(() => setClock(clockTimeOfDay()), 60_000)
    return () => window.clearInterval(id)
  }, [setting])
  return setting === 'auto' ? clock : setting
}
