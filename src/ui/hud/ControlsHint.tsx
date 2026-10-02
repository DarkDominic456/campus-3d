import { useGameStore } from '../../store/useGameStore'
import { useTourStore } from '../../tour/tour'

const TOUCH_CONTROLS: [string[], string][] = [
  [['Stick'], 'Move (push fully to run)'],
  [['Drag'], 'Look around'],
  [['Pinch'], 'Zoom'],
  [['Jump'], 'Jump'],
  [['Button'], 'Interact when nearby'],
  [['Leave'], 'Stand up / leave a game'],
]

const CONTROLS: [string[], string][] = [
  [['W', 'A', 'S', 'D'], 'Move (or arrow keys)'],
  [['Shift'], 'Run'],
  [['Space'], 'Jump'],
  [['Drag'], 'Look around'],
  [['Scroll'], 'Zoom'],
  [['E'], 'Interact'],
  [['Esc'], 'Close panel'],
  [['T'], 'Teleport menu'],
  [['H'], 'Show / hide this help'],
]

/** Controls cheat-sheet, shown automatically on the first visit. Doesn't block movement. */
export function ControlsHint({ touch = false }: { touch?: boolean }) {
  const show = useGameStore((s) => s.showControlsHint)
  const setShow = useGameStore((s) => s.setShowControlsHint)
  const tourActive = useTourStore((s) => s.active)
  if (!show) return null
  const close = () => {
    useTourStore.getState().setOffered()
    setShow(false)
  }

  return (
    <div className="pointer-events-auto max-h-[calc(100dvh-5rem)] w-72 overflow-y-auto rounded-xl bg-slate-900/85 p-4 text-slate-100 shadow-xl ring-1 ring-white/15 backdrop-blur animate-[prompt-in_200ms_ease-out]">
      <h2 className="mb-1 text-sm font-semibold">Welcome! Here's how to get around</h2>
      <p className="mb-3 text-xs text-slate-400">Walk through the gate to explore the campus.</p>
      <ul className="space-y-1.5 text-sm">
        {(touch ? TOUCH_CONTROLS : CONTROLS).map(([keys, label]) => (
          <li key={label} className="flex items-center gap-2">
            <span className="flex w-28 shrink-0 gap-1">
              {keys.map((k) => (
                <kbd key={k} className="rounded bg-white/90 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-900">
                  {k}
                </kbd>
              ))}
            </span>
            <span className="text-slate-300">{label}</span>
          </li>
        ))}
      </ul>
      {!tourActive && (
        <button
          type="button"
          onClick={() => {
            useTourStore.getState().start()
            setShow(false)
          }}
          className="mt-4 w-full rounded-lg bg-emerald-500 py-1.5 text-sm font-semibold text-white hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-white"
        >
          Take the campus tour
        </button>
      )}
      <button
        type="button"
        onClick={close}
        className={`${tourActive ? 'mt-4' : 'mt-2'} w-full rounded-lg bg-sky-500 py-1.5 text-sm font-semibold text-white hover:bg-sky-400 focus-visible:outline-2 focus-visible:outline-white`}
      >
        {tourActive ? 'Got it' : 'Explore on my own'}
      </button>
    </div>
  )
}
