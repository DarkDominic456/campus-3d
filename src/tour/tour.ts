import { create } from 'zustand'
import type { Vector3Tuple } from 'three'
import { FLOOR1_Y, SPOTS } from '../world/layout'
import { playSound } from '../audio/audio'

/**
 * Guided first visit: a short list of things to do around the campus. Steps can be completed
 * in any order and are recorded even while the tour is hidden, so starting it later shows real
 * progress. Saved in localStorage. Completion events come from TourTracker (store changes) and
 * ArcadeOverlay (a finished game).
 */
export type TourStepId = 'account' | 'classroom' | 'arcade' | 'sport' | 'profile' | 'presentation'

export interface TourStep {
  id: TourStepId
  title: string
  hint: string
  /** Where the guide beacon stands (feet level, world space). */
  target: Vector3Tuple
  /** "Take me there": capsule-center position + facing. */
  spot: { position: Vector3Tuple; facing: number }
}

const F = FLOOR1_Y

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'account',
    title: 'Create your account',
    hint: 'Walk to the LOGIN / SIGN UP booth at the entrance gate and press E. Already have one? Log in.',
    target: [6.55, 0, 33],
    spot: SPOTS.gateBooth,
  },
  {
    id: 'classroom',
    title: 'Take a seat in class',
    hint: 'Find the free desk in the classroom (ground floor, left of the hall) and press E to sit — the laptop opens the courses.',
    target: [-6.78, 0, 4.37],
    spot: { position: [-6.2, 0.9, 4.4], facing: -Math.PI / 2 },
  },
  {
    id: 'arcade',
    title: 'Play an arcade game',
    hint: 'In the gaming room (right of the hall), press E at a cabinet and finish a round of Snake, Puzzle or Paint.',
    target: [7, 0, -12.3],
    spot: { position: [7, 0.9, -11.4], facing: Math.PI },
  },
  {
    id: 'sport',
    title: 'Play a sport outside',
    hint: 'Go out the back door to the outdoor ground and finish a round of basketball, football penalties or cricket.',
    target: [-30, 0, -41.5],
    spot: { position: [-30, 0.9, -40.5], facing: Math.PI },
  },
  {
    id: 'profile',
    title: 'Set up your profile',
    hint: 'Take the stairs to the office (first floor, left) and press E at the PROFILE desk.',
    target: [-8.5, F, -3],
    spot: SPOTS.profileDesk,
  },
  {
    id: 'presentation',
    title: 'Watch the presentation',
    hint: 'In the conference room (first floor, right), press E in front of the big screen.',
    target: [15.6, F, -2],
    spot: { position: [14.4, F + 0.9, -2], facing: Math.PI / 2 },
  },
]

interface TourState {
  /** Panel + guide visible. */
  active: boolean
  done: TourStepId[]
  /** The visitor has been offered the tour (welcome card) — don't auto-offer again. */
  offered: boolean
  /** Last completed step, for the HUD toast (with a key so repeats re-trigger). */
  lastCompleted: { id: TourStepId; key: number } | null
  start: () => void
  stop: () => void
  restart: () => void
  setOffered: () => void
  complete: (id: TourStepId) => void
}

const KEY = 'campus3d.tour'

function load(): Pick<TourState, 'active' | 'done' | 'offered'> {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    const done = Array.isArray(saved.done) ? saved.done.filter((id: string) => TOUR_STEPS.some((s) => s.id === id)) : []
    return { active: !!saved.active, done, offered: !!saved.offered }
  } catch {
    return { active: false, done: [], offered: false }
  }
}

export const useTourStore = create<TourState>()((set, get) => {
  const save = () => {
    const { active, done, offered } = get()
    try {
      localStorage.setItem(KEY, JSON.stringify({ active, done, offered }))
    } catch {
      // Storage unavailable: progress lasts for this visit only.
    }
  }
  return {
    ...load(),
    lastCompleted: null,
    start: () => {
      set({ active: true, offered: true })
      save()
    },
    stop: () => {
      set({ active: false })
      save()
    },
    restart: () => {
      set({ active: true, offered: true, done: [], lastCompleted: null })
      save()
    },
    setOffered: () => {
      set({ offered: true })
      save()
    },
    complete: (id) => {
      if (get().done.includes(id)) return
      set({ done: [...get().done, id], lastCompleted: { id, key: Date.now() } })
      save()
      if (get().active) playSound('achievement', { volume: 0.6 })
    },
  }
})

/** The first step not done yet (null = tour complete). */
export const currentTourStep = (done: TourStepId[]) => TOUR_STEPS.find((s) => !done.includes(s.id)) ?? null
