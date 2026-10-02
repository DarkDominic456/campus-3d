import { useEffect, useState } from 'react'
import { useGameStore } from '../../store/useGameStore'
import { TOUR_STEPS, currentTourStep, useTourStore } from '../../tour/tour'

/**
 * Guided-tour card under the location badge: current step, progress, "take me there".
 * Collapsible to a one-line chip — collapsed by default on touch, where the joystick needs the room.
 */
export function TourPanel({ touch = false }: { touch?: boolean }) {
  const active = useTourStore((s) => s.active)
  const done = useTourStore((s) => s.done)
  const stop = useTourStore((s) => s.stop)
  const focused = useGameStore((s) => s.focus !== null)
  const toast = useStepToast()
  const [collapsed, setCollapsed] = useState(touch)
  // Touch is detected after the first render on some devices.
  useEffect(() => {
    if (touch) setCollapsed(true)
  }, [touch])
  if (!active) return null

  const step = currentTourStep(done)
  const index = step ? TOUR_STEPS.indexOf(step) : TOUR_STEPS.length

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-expanded={false}
        className="pointer-events-auto flex max-w-72 items-center gap-2 rounded-full bg-slate-900/85 px-3 py-1.5 text-left text-xs text-slate-100 shadow-lg ring-1 ring-white/15 backdrop-blur"
      >
        <span className="font-semibold text-sky-300">
          Tour {Math.min(done.length, TOUR_STEPS.length)}/{TOUR_STEPS.length}
        </span>
        <span className="truncate">{toast ? `✓ ${toast.title}` : step ? step.title : 'Complete! 🎉'}</span>
        <span aria-hidden>▸</span>
      </button>
    )
  }

  return (
    <div className="pointer-events-auto w-72 rounded-xl bg-slate-900/85 p-3.5 text-slate-100 shadow-xl ring-1 ring-white/15 backdrop-blur" role="region" aria-label="Campus tour">
      {toast && (
        <p key={toast.key} role="status" className="mb-2 rounded-lg bg-emerald-500/20 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 animate-[prompt-in_200ms_ease-out]">
          ✓ {toast.title}
        </p>
      )}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold tracking-wider text-sky-300 uppercase">
          Campus tour · {Math.min(done.length, TOUR_STEPS.length)} / {TOUR_STEPS.length}
        </p>
        <span className="flex gap-1">
          <button type="button" onClick={() => setCollapsed(true)} className="rounded px-1.5 text-xs text-slate-400 hover:text-white" aria-expanded aria-label="Minimise the tour panel">
            Hide
          </button>
          <button type="button" onClick={stop} className="rounded px-1.5 text-xs text-slate-400 hover:text-white" aria-label="End the tour">
            End tour
          </button>
        </span>
      </div>
      <div className="mt-1.5 flex gap-1" aria-hidden>
        {TOUR_STEPS.map((s) => (
          <span key={s.id} className={`h-1.5 flex-1 rounded-full ${done.includes(s.id) ? 'bg-emerald-400' : s === step ? 'bg-sky-400' : 'bg-white/15'}`} />
        ))}
      </div>
      {step ? (
        !focused && (
          <>
            <h2 className="mt-2.5 text-sm font-semibold">
              {index + 1}. {step.title}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">{step.hint}</p>
            <p className="mt-1.5 text-[11px] text-slate-400">Follow the blue arrow to the glowing beacon.</p>
            <button
              type="button"
              onClick={() => useGameStore.getState().requestTeleport(step.spot.position, step.spot.facing)}
              className="mt-2.5 w-full rounded-lg bg-sky-500 py-1.5 text-sm font-semibold text-white hover:bg-sky-400 focus-visible:outline-2 focus-visible:outline-white"
            >
              Take me there
            </button>
          </>
        )
      ) : (
        <>
          <h2 className="mt-2.5 text-sm font-semibold">Tour complete! 🎉</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">
            You've seen the whole campus. Keep exploring — try beating your arcade and sports high scores.
          </p>
          <button type="button" onClick={stop} className="mt-2.5 w-full rounded-lg bg-emerald-500 py-1.5 text-sm font-semibold text-white hover:bg-emerald-400">
            Close
          </button>
        </>
      )}
    </div>
  )
}

/** "✓ Step title" for a few seconds after a step completes. */
function useStepToast() {
  const last = useTourStore((s) => s.lastCompleted)
  const [toast, setToast] = useState<{ title: string; key: number } | null>(null)
  useEffect(() => {
    if (!last) return
    const step = TOUR_STEPS.find((s) => s.id === last.id)
    if (!step) return
    setToast({ title: step.title, key: last.key })
    const id = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(id)
  }, [last])
  return toast
}
