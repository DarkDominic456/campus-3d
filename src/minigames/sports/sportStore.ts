import { create } from 'zustand'
import type { SubmitScoreResult } from '../../services/scores'

export type SportId = 'basketball' | 'football' | 'cricket'
export type SportPhase = 'countdown' | 'playing' | 'over'

export interface SportMessage {
  text: string
  tone: 'good' | 'great' | 'bad'
  /** Changes every flash so the HUD can re-trigger its animation. */
  key: number
}

interface SportState {
  active: SportId | null
  phase: SportPhase
  /** Increments on every (re)start so sport components can reset themselves. */
  run: number
  countdown: number
  timeLeft: number
  score: number
  /** Secondary line in the HUD, e.g. "Ball 4/12 · Wickets 1". */
  stat: string
  message: SportMessage | null
  result: (SubmitScoreResult & { score: number }) | null

  start: (id: SportId) => void
  restart: () => void
  stop: () => void
  addScore: (points: number) => void
  setStat: (stat: string) => void
  flash: (text: string, tone: SportMessage['tone']) => void
  /** End the round early (e.g. cricket after the last ball). */
  finish: () => void
}

const fresh = { phase: 'countdown' as SportPhase, countdown: 3, timeLeft: 0, score: 0, stat: '', message: null, result: null }

export const useSportStore = create<SportState>()((set, get) => ({
  active: null,
  run: 0,
  ...fresh,

  start: (id) => set({ active: id, run: get().run + 1, ...fresh }),
  restart: () => set({ run: get().run + 1, ...fresh }),
  stop: () => set({ active: null, ...fresh }),
  addScore: (points) => set({ score: get().score + points }),
  setStat: (stat) => set({ stat }),
  flash: (text, tone) => set({ message: { text, tone, key: Date.now() } }),
  finish: () => {
    if (get().phase === 'playing') set({ phase: 'over', timeLeft: 0 })
  },
}))

/**
 * Per-frame values for the aim / power meters. Mutated by the active sport every frame and
 * read by SportHud in requestAnimationFrame — never put these in zustand.
 */
export const sportRuntime = {
  stage: 'idle' as 'idle' | 'aim' | 'power' | 'wait',
  /** -1 … 1 */
  aim: 0,
  /** 0 … 1 */
  power: 0,
  aimZone: null as [number, number] | null,
  powerZone: null as [number, number] | null,
  prompt: '',
  /** Cricket: seconds until the ball reaches the bat (null when no ball is coming). */
  eta: null as number | null,
}

export function resetRuntime() {
  Object.assign(sportRuntime, { stage: 'idle', aim: 0, power: 0, aimZone: null, powerZone: null, prompt: '', eta: null })
}

/** Oscillates 0 → 1 → 0 with the given period (seconds). */
export const pingPong = (t: number, period: number) => {
  const x = (t / period) % 1
  return x < 0.5 ? x * 2 : 2 - x * 2
}
