import { create } from 'zustand'

/**
 * Which experience to show:
 *  - '3d'     the walkable campus (lazy chunk with three.js + Rapier)
 *  - '2d'     the lightweight web-page version with the same content
 *  - 'choose' ask first (device looks weak)
 */
export type Mode = '3d' | '2d' | 'choose'

const PREF_KEY = 'campus3d.mode'

export function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

/** Cheap pre-flight guess; the real check is the FPS watcher once 3D is running. */
export function looksWeak(): boolean {
  const n = navigator as Navigator & { deviceMemory?: number }
  return (n.hardwareConcurrency ?? 8) <= 2 || (n.deviceMemory ?? 8) <= 2
}

function readPref(): Mode | null {
  try {
    const v = localStorage.getItem(PREF_KEY)
    return v === '2d' || v === '3d' ? v : null
  } catch {
    return null
  }
}

function initialMode(webgl: boolean): Mode {
  const param = new URLSearchParams(location.search).get('mode')
  if (!webgl) return '2d'
  if (param === '2d' || param === '3d') return param
  return readPref() ?? (looksWeak() ? 'choose' : '3d')
}

interface ModeState {
  mode: Mode
  webgl: boolean
  setMode: (mode: '2d' | '3d') => void
}

export const useModeStore = create<ModeState>()((set, get) => {
  const webgl = supportsWebGL()
  return {
    mode: initialMode(webgl),
    webgl,
    setMode: (mode) => {
      if (mode === '3d' && !get().webgl) return
      try {
        localStorage.setItem(PREF_KEY, mode)
      } catch {
        // preference just won't persist
      }
      set({ mode })
    },
  }
})
