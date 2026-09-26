import { useState } from 'react'
import { useModeStore } from '../mode/mode'

const TIPS = [
  'Walk with W A S D, hold Shift to run.',
  'Press E next to anything glowing with a prompt.',
  'Press T to teleport anywhere on campus.',
  'Log in at the gate to save your high scores.',
  'Sit at a free classroom seat to open the Learning page.',
]

/**
 * Full-screen loading screen (no three.js imports, so it can show while the 3D chunk downloads).
 * `progress` null = indeterminate.
 */
export function LoadingView({ progress, label, fading = false }: { progress: number | null; label: string; fading?: boolean }) {
  const setMode = useModeStore((s) => s.setMode)
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)])

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-b from-sky-200 via-sky-100 to-emerald-100 text-slate-800 transition-opacity duration-500 ${
        fading ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress ?? undefined}
      aria-label={label}
    >
      <h1 className="text-4xl font-black tracking-tight text-slate-900">Campus 3D</h1>
      <p className="mt-2 text-sm text-slate-600">{label}</p>
      <div className="mt-6 h-2.5 w-72 overflow-hidden rounded-full bg-white/70 shadow-inner">
        {progress === null ? (
          <div className="h-full w-1/3 animate-[loading-slide_1.2s_ease-in-out_infinite] rounded-full bg-sky-500" />
        ) : (
          <div className="h-full rounded-full bg-sky-500 transition-[width] duration-300" style={{ width: `${Math.round(progress)}%` }} />
        )}
      </div>
      <p className="mt-2 h-4 text-xs font-semibold text-slate-500 tabular-nums">{progress === null ? '' : `${Math.round(progress)}%`}</p>
      <p className="mt-8 max-w-xs text-center text-sm text-slate-600">Tip: {tip}</p>
      <button type="button" onClick={() => setMode('2d')} className="mt-6 text-xs font-medium text-sky-700 underline underline-offset-2 hover:text-sky-900">
        Slow connection or older device? Use the 2D version
      </button>
    </div>
  )
}
