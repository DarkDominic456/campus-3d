import { useEffect } from 'react'
import { useGameStore } from '../../store/useGameStore'
import { zoneLabel } from '../../world/zoneConfig'
import { ControlsHint } from './ControlsHint'
import { Minimap } from './Minimap'
import { SportHud } from './SportHud'
import { isTypingTarget } from '../../utils/dom'
import { useIsTouch } from '../touch'
import { TouchControls } from './TouchControls'
import { useModeStore } from '../../mode/mode'

/** Always-on screen chrome: location, user, teleport/help buttons, minimap, controls hint. */
export function HUD() {
  useHudHotkeys()
  // Cinematic focus views (seated laptop, presentation) hide the map.
  const focused = useGameStore((s) => s.focus !== null)
  const touch = useIsTouch()
  const setMode = useModeStore((s) => s.setMode)

  return (
    <>
      <div className="absolute top-3 left-3">
        <LocationBadge />
      </div>
      <div className="absolute top-3 right-3 flex flex-wrap items-center justify-end gap-2">
        <UserChip />
        <HudButton label="Teleport" hotkey={touch ? undefined : 'T'} onClick={toggleTeleport} />
        <HudButton label="Controls" hotkey={touch ? undefined : 'H'} onClick={toggleHint} />
        <HudButton label="2D site" onClick={() => setMode('2d')} />
      </div>
      {/* On touch the bottom corners belong to the joystick and buttons. */}
      <div className={`absolute left-3 ${touch ? 'top-20' : 'bottom-3'}`}>
        <ControlsHint touch={touch} />
      </div>
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
        if (!useGameStore.getState().activeOverlay) openOverlay('auth')
      }}
      title={user ? 'Your account' : 'Log in or sign up'}
      className="pointer-events-auto hidden rounded-full bg-slate-900/75 px-3 py-1.5 text-sm text-white shadow-lg ring-1 ring-white/15 backdrop-blur hover:bg-slate-800 sm:block"
    >
      {user ? (
        <>
          Logged in as <span className="font-semibold">{user.name}</span>
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
