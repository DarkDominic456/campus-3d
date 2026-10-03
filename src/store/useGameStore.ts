import { create } from 'zustand'
import type { Vector3Tuple } from 'three'
import { CHARACTERS, type CharacterVariant } from '../assets/models'
import type { User } from '../services/auth'
import type { GameId } from '../minigames/registry'

/**
 * Every overlay that can be opened, mapped to the props it takes.
 * Add new ids here and in ui/overlays/registry.ts.
 */
export interface OverlayPropsMap {
  /** Generic "title + text" panel, used by placeholder interactables until their phase lands. */
  info: { title: string; body: string }
  teleport: Record<string, never>
  /** Login / signup / account (gate booth, HUD user chip). */
  auth: { mode?: 'login' | 'signup' }
  /** Courses shown on the classroom laptop. */
  learning: Record<string, never>
  /** Office reception: demo request form + pricing. */
  office: { tab?: 'demo' | 'pricing' }
  /** Gaming room: mini-game launcher, or straight into one game (arcade cabinets). */
  arcade: { game?: GameId }
  /** Office profile desk / HUD user chip: edit profile, email, password. */
  profile: Record<string, never>
  /** HUD → Settings: sound, time of day, tour. */
  settings: Record<string, never>
  /** Who's online (multiplayer) + privacy toggles. */
  people: Record<string, never>
  /** Another visitor's public profile card. */
  peerCard: { id: string }
}
export type OverlayId = keyof OverlayPropsMap

export interface ActiveOverlay {
  id: OverlayId
  props?: OverlayPropsMap[OverlayId]
}

/** Drives PlayerModel animations (a subset of CharacterAnim in characters/clips.ts). */
export type PlayerAnimation = 'idle' | 'walk' | 'run' | 'jump' | 'fall' | 'sit' | 'study' | 'talk' | 'wave'

/** An interactable whose trigger zone the player is currently inside. */
export interface NearbyInteractable {
  id: string
  prompt: string
  interact: () => void
}

/** A fixed camera framing (world space). */
export interface CameraShot {
  position: Vector3Tuple
  target: Vector3Tuple
}

/**
 * The player is locked into something: sitting at a seat, or looking at a screen.
 * Movement and interaction are disabled; Esc (or closing the linked overlay) exits.
 */
export interface FocusState {
  id: string
  camera: CameraShot
  /** Pin the player here (feet position, facing radians, pose) — seats, sport spots. */
  seat?: { position: Vector3Tuple; facing: number; animation: PlayerAnimation }
  /** Hide the player model (e.g. when the camera stands where the player is). */
  hidePlayer?: boolean
  /** Leave focus automatically when the overlay is closed. */
  exitWithOverlay?: boolean
  /** Shown in the HUD while focused, e.g. "← → change slide". */
  hint?: string
}

interface GameState {
  activeOverlay: ActiveOverlay | null
  openOverlay: <K extends OverlayId>(id: K, props?: OverlayPropsMap[K]) => void
  closeOverlay: () => void
  /** Optional veto on closing (e.g. unsaved profile changes); return false to keep it open. */
  closeGuard: (() => boolean) | null
  setCloseGuard: (guard: (() => boolean) | null) => void

  /**
   * Teleport request from UI that must stay free of three.js (it is shared with the 2D site).
   * A bridge in App3D performs it with playerRuntime.teleportTo.
   */
  teleportRequest: { position: Vector3Tuple; facing: number } | null
  requestTeleport: (position: Vector3Tuple, facing: number) => void
  clearTeleportRequest: () => void

  focus: FocusState | null
  enterFocus: (focus: FocusState) => void
  exitFocus: () => void

  /** Ordered by entry time; the last entry is the one E acts on. */
  nearby: NearbyInteractable[]
  registerNearby: (item: NearbyInteractable) => void
  unregisterNearby: (id: string) => void

  playerAnimation: PlayerAnimation
  setPlayerAnimation: (anim: PlayerAnimation) => void
  /** Which character model the player uses (chosen at signup). */
  playerAvatar: CharacterVariant
  setPlayerAvatar: (variant: CharacterVariant) => void

  /** Zone id from world/zoneConfig.ts ('campus' when outside every zone). Set by ZoneTracker. */
  currentZone: string
  /** 0 = ground floor, 1 = first floor. */
  currentFloor: 0 | 1
  setLocation: (zone: string, floor: 0 | 1) => void

  /** The chat input is open (typing must not move the player). */
  chatOpen: boolean
  setChatOpen: (open: boolean) => void

  showControlsHint: boolean
  setShowControlsHint: (show: boolean) => void

  /** 'low' = DPR 1 and no real-time shadows (set by PerformanceMonitor on slow GPUs). */
  graphicsQuality: 'high' | 'low'
  setGraphicsQuality: (q: 'high' | 'low') => void

  /** Signed-in user (services/auth.ts); null = guest. */
  user: User | null
  setUser: (user: User | null) => void
}

const HINT_SEEN_KEY = 'campus3d.controlsHintSeen'
export const DEFAULT_AVATAR: CharacterVariant = 'male-a'

function readHintSeen() {
  try {
    return localStorage.getItem(HINT_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

export const useGameStore = create<GameState>()((set, get) => ({
  activeOverlay: null,
  openOverlay: (id, props) => set({ activeOverlay: { id, props }, closeGuard: null }),
  closeOverlay: () => {
    const guard = get().closeGuard
    if (guard && !guard()) return
    set({ activeOverlay: null, closeGuard: null })
    if (get().focus?.exitWithOverlay) get().exitFocus()
  },

  closeGuard: null,
  setCloseGuard: (closeGuard) => set({ closeGuard }),

  teleportRequest: null,
  requestTeleport: (position, facing) => set({ teleportRequest: { position, facing } }),
  clearTeleportRequest: () => set({ teleportRequest: null }),

  focus: null,
  enterFocus: (focus) => set({ focus }),
  exitFocus: () => set({ focus: null }),

  nearby: [],
  registerNearby: (item) =>
    set((s) => ({ nearby: [...s.nearby.filter((n) => n.id !== item.id), item] })),
  unregisterNearby: (id) => set((s) => ({ nearby: s.nearby.filter((n) => n.id !== id) })),

  playerAnimation: 'idle',
  setPlayerAnimation: (playerAnimation) => set({ playerAnimation }),
  playerAvatar: DEFAULT_AVATAR,
  setPlayerAvatar: (playerAvatar) => set({ playerAvatar }),

  currentZone: 'gate',
  currentFloor: 0,
  setLocation: (currentZone, currentFloor) => set({ currentZone, currentFloor }),

  chatOpen: false,
  setChatOpen: (chatOpen) => set({ chatOpen }),

  showControlsHint: !readHintSeen(),
  setShowControlsHint: (showControlsHint) => {
    if (!showControlsHint) {
      try {
        localStorage.setItem(HINT_SEEN_KEY, '1')
      } catch {
        // storage unavailable (private mode etc.) — hint will just show again next visit
      }
    }
    set({ showControlsHint })
  },

  graphicsQuality: 'high',
  setGraphicsQuality: (graphicsQuality) => set({ graphicsQuality }),

  user: null,
  // Avatars removed in an update (e.g. the old Kenney 'female-f') fall back to the default.
  setUser: (user) =>
    set({ user, playerAvatar: user && (CHARACTERS as readonly string[]).includes(user.avatar) ? user.avatar : DEFAULT_AVATAR }),
}))

/** True while player input (movement, jump, interact, camera drag) must be ignored. */
export const isInputLocked = () => {
  const s = useGameStore.getState()
  return s.activeOverlay !== null || s.focus !== null || s.chatOpen
}

/** The interactable E would trigger right now, if any. */
export const selectActiveInteractable = (s: GameState) => s.nearby[s.nearby.length - 1] ?? null

/** Shorthand for placeholder interactables whose real feature lands in a later phase. */
export const openInfo = (title: string, body: string) =>
  useGameStore.getState().openOverlay('info', { title, body })
