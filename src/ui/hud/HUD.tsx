import { useEffect } from 'react'
import { useGameStore } from '../../store/useGameStore'
import { zoneLabel } from '../../world/zoneConfig'
import { ControlsHint } from './ControlsHint'
import { TourPanel } from './TourPanel'
import { LiveBanner } from './LiveBanner'
import { ChatBox } from './ChatBox'
import { PRESENCE_MODE, usePresence } from '../../multiplayer/presence'
import { Minimap } from './Minimap'
import { SportHud } from './SportHud'
import { isTypingTarget } from '../../utils/dom'
import { useIsTouch } from '../touch'
import { TouchControls } from './TouchControls'
import { useModeStore } from '../../mode/mode'
import { displayName } from '../../services/auth'
import { useSettings } from '../../settings/settings'

/** Always-on screen chrome: location, user, teleport/help buttons, minimap, controls hint. */
export function HUD() {
  useHudHotkeys()
  // Cinematic focus views (seated laptop, presentation) hide the map.
  const focused = useGameStore((s) => s.focus !== null)
  const touch = useIsTouch()
  const setMode = useModeStore((s) => s.setMode)
  const showHint = useGameStore((s) => s.showControlsHint)

  return (
    <>
      <div className="absolute top-3 left-3 flex flex-col items-start gap-2">
        <LocationBadge />
        <TourPanel touch={touch} />
        <LiveBanner />
      </div>
      {/* On touch the bottom corners belong to the joystick and buttons: the welcome card goes top-center. */}
      {touch && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2">
          <ControlsHint touch />
        </div>
      )}
      <div className="absolute top-3 right-3 flex flex-wrap items-center justify-end gap-2">
        <PresenceChip />
        <UserChip />
        <HudButton label="Teleport" hotkey={touch ? undefined : 'T'} onClick={toggleTeleport} />
        <HudButton label="Controls" hotkey={touch ? undefined : 'H'} onClick={toggleHint} />
        <SoundButton />
        <HudButton label="Settings" onClick={openSettings} />
        <HudButton label="2D site" onClick={() => setMode('2d')} />
      </div>
      {!touch && (
        <div className="absolute bottom-3 left-3 flex flex-col items-start gap-2">
          <ChatBox />
          <ControlsHint />
        </div>
      )}
      {touch && !showHint && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2">
          <ChatBox touch />
        </div>
      )}
      {touch && <TouchControls />}
      {!focused && !touch && (
        <div className="absolute right-3 bottom-3">
          <Minimap />
        </div>
      )}
      <FocusHint />
      <SportHud />
    </>
  )
}

function toggleTeleport() {
  const s = useGameStore.getState()
  if (s.activeOverlay?.id === 'teleport') s.closeOverlay()
  else if (!s.activeOverlay && !s.focus) s.openOverlay('teleport')
}

function openSettings() {
  const s = useGameStore.getState()
  if (!s.activeOverlay) s.openOverlay('settings')
}

function toggleHint() {
  const s = useGameStore.getState()
  if (s.activeOverlay) return // H is a normal key inside overlays (e.g. games)
  s.setShowControlsHint(!s.showControlsHint)
}

function useHudHotkeys() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || isTypingTarget(e.target)) return
      if (e.code === 'KeyT') toggleTeleport()
      else if (e.code === 'KeyH') toggleHint()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}

function LocationBadge() {
  const zone = useGameStore((s) => s.currentZone)
  const floor = useGameStore((s) => s.currentFloor)
  return (
    <div className="rounded-xl bg-slate-900/75 px-4 py-2 text-white shadow-lg ring-1 ring-white/15 backdrop-blur">
      <div className="text-[10px] font-semibold tracking-wider text-sky-300 uppercase">
        {floor === 1 ? 'First floor' : 'Ground floor'}
      </div>
      <div className="text-base font-semibold" aria-live="polite">
        {zoneLabel(zone)}
      </div>
    </div>
  )
}

function UserChip() {
  const user = useGameStore((s) => s.user)
  const openOverlay = useGameStore((s) => s.openOverlay)
  return (
    <button
      type="button"
      onClick={() => {
        if (!useGameStore.getState().activeOverlay) openOverlay(user ? 'profile' : 'auth')
      }}
      title={user ? 'Your profile' : 'Log in or sign up'}
      className="pointer-events-auto hidden items-center gap-2 rounded-full bg-slate-900/75 py-1.5 pr-3 pl-1.5 text-sm text-white shadow-lg ring-1 ring-white/15 backdrop-blur hover:bg-slate-800 sm:flex"
    >
      {user ? (
        <>
          {user.profile.photo ? (
            <img src={user.profile.photo} alt="" className="size-6 rounded-full object-cover" />
          ) : (
            <span className="flex size-6 items-center justify-center rounded-full bg-sky-500 text-xs font-bold">
              {displayName(user).charAt(0).toUpperCase()}
            </span>
          )}
          <span className="max-w-32 truncate font-semibold">{displayName(user)}</span>
        </>
      ) : (
        <>
          <span className="font-semibold">Guest</span>
          <span className="text-slate-400"> · log in at the gate</span>
        </>
      )}
    </button>
  )
}

/** Bottom-center reminder of how to leave a focus state — also a tap target on touch screens. */
function FocusHint() {
  const focus = useGameStore((s) => s.focus)
  const overlayOpen = useGameStore((s) => s.activeOverlay !== null)
  const exitFocus = useGameStore((s) => s.exitFocus)
  if (!focus || overlayOpen) return null
  const seated = focus.seat && (focus.seat.animation === 'sit' || focus.seat.animation === 'study')
  return (
    <button
      type="button"
      onClick={exitFocus}
      className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/80 px-4 py-2 text-sm text-white shadow-lg ring-1 ring-white/15 backdrop-blur hover:bg-slate-800"
    >
      {focus.hint && <span className="mr-3">{focus.hint}</span>}
      <kbd className="rounded bg-white/90 px-1.5 font-mono text-[11px] font-bold text-slate-900">Esc</kbd>{' '}
      {seated ? 'stand up' : 'leave'}
    </button>
  )
}

/** "● 3 online" — opens the People panel (multiplayer). */
function PresenceChip() {
  const status = usePresence((s) => s.status)
  const count = usePresence((s) => Object.keys(s.peers).length)
  if (!PRESENCE_MODE) return null
  const label = status === 'online' ? `${count + 1} online` : status === 'off' ? 'Hidden' : status === 'connecting' ? 'Connecting…' : 'Offline'
  return (
    <button
      type="button"
      onClick={() => {
        const s = useGameStore.getState()
        if (!s.activeOverlay) s.openOverlay('people')
      }}
      title="People on campus"
      className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-slate-900/75 px-3 py-1.5 text-sm font-medium text-white shadow-lg ring-1 ring-white/15 backdrop-blur hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-sky-400"
    >
      <span className={`size-2 rounded-full ${status === 'online' ? 'bg-emerald-400' : status === 'off' ? 'bg-slate-400' : 'bg-amber-400'}`} aria-hidden />
      {label}
    </button>
  )
}

/** One-tap mute (the full controls live in Settings). */
function SoundButton() {
  const muted = useSettings((s) => s.muted)
  const set = useSettings((s) => s.set)
  return (
    <button
      type="button"
      onClick={() => set({ muted: !muted })}
      aria-label={muted ? 'Turn sound on' : 'Mute sound'}
      aria-pressed={!muted}
      title={muted ? 'Sound off' : 'Sound on'}
      className="pointer-events-auto flex size-8 items-center justify-center rounded-full bg-slate-900/75 text-white shadow-lg ring-1 ring-white/15 backdrop-blur hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-sky-400"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" />
        {muted ? <path d="m16 9 5 6m0-6-5 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}
      </svg>
    </button>
  )
}

function HudButton({ label, hotkey, onClick }: { label: string; hotkey?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pointer-events-auto flex items-center gap-2 rounded-full bg-slate-900/75 px-3 py-1.5 text-sm font-medium text-white shadow-lg ring-1 ring-white/15 backdrop-blur hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-sky-400"
    >
      {label}
      {hotkey && <kbd className="rounded bg-white/90 px-1 font-mono text-[11px] font-bold text-slate-900">{hotkey}</kbd>}
    </button>
  )
}
