import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { externalInput } from '../../player/controls'
import { selectActiveInteractable, useGameStore } from '../../store/useGameStore'

const STICK_RADIUS = 56 // px the knob can travel
const RUN_THRESHOLD = 0.9 // push the stick this far to run

/**
 * Phone / tablet controls: a virtual joystick (writes `externalInput`, which Player merges with
 * the keyboard), plus Jump and Interact buttons. Dragging anywhere else on the screen still
 * rotates the camera; two fingers pinch-zoom.
 */
export function TouchControls() {
  const busy = useGameStore((s) => s.activeOverlay !== null || s.focus !== null)
  const active = useGameStore(selectActiveInteractable)
  if (busy) return null

  return (
    <>
      <Joystick />
      <div className="absolute right-5 bottom-8 flex items-end gap-3">
        {active && (
          <button
            type="button"
            onClick={() => active.interact()}
            className="pointer-events-auto max-w-40 rounded-full bg-sky-500 px-5 py-4 text-sm font-bold text-white shadow-lg ring-2 ring-white/60 active:scale-95"
          >
            {promptLabel(active.prompt)}
          </button>
        )}
        <button
          type="button"
          aria-label="Jump"
          onPointerDown={() => (externalInput.jump = true)}
          onPointerUp={() => (externalInput.jump = false)}
          onPointerCancel={() => (externalInput.jump = false)}
          onPointerLeave={() => (externalInput.jump = false)}
          className="pointer-events-auto flex size-16 items-center justify-center rounded-full bg-white/80 text-sm font-bold text-slate-800 shadow-lg ring-2 ring-white active:scale-95"
        >
          Jump
        </button>
      </div>
    </>
  )
}

/** "Press E to sit" → "Sit". */
const promptLabel = (prompt: string) => {
  const text = prompt.replace(/^press e to\s*/i, '')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function Joystick() {
  const knob = useRef<HTMLDivElement>(null)
  const origin = useRef<{ x: number; y: number; id: number } | null>(null)

  const update = (e: ReactPointerEvent) => {
    const o = origin.current
    if (!o || e.pointerId !== o.id) return
    let dx = e.clientX - o.x
    let dy = e.clientY - o.y
    const len = Math.hypot(dx, dy)
    if (len > STICK_RADIUS) {
      dx = (dx / len) * STICK_RADIUS
      dy = (dy / len) * STICK_RADIUS
    }
    if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`
    externalInput.move.x = dx / STICK_RADIUS
    externalInput.move.y = -dy / STICK_RADIUS // screen up = forward
    externalInput.run = Math.min(1, len / STICK_RADIUS) >= RUN_THRESHOLD
  }

  const release = (e: ReactPointerEvent) => {
    if (origin.current?.id !== e.pointerId) return
    origin.current = null
    externalInput.move.x = 0
    externalInput.move.y = 0
    externalInput.run = false
    if (knob.current) knob.current.style.transform = 'translate(0px, 0px)'
  }

  return (
    <div
      className="pointer-events-auto absolute bottom-8 left-6 flex size-36 touch-none items-center justify-center rounded-full bg-white/25 ring-2 ring-white/60 backdrop-blur-sm"
      aria-label="Movement joystick"
      role="application"
      onPointerDown={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        origin.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, id: e.pointerId }
        e.currentTarget.setPointerCapture(e.pointerId)
        update(e)
      }}
      onPointerMove={update}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div ref={knob} className="size-16 rounded-full bg-white/90 shadow-lg" />
    </div>
  )
}
