import { lazy, Suspense, useEffect } from 'react'
import { useModeStore } from './mode/mode'
import { auth } from './services/auth'
import { useGameStore } from './store/useGameStore'
import { LoadingView } from './ui/LoadingView'
import { Site2D } from './site2d/Site2D'

// The whole 3D experience (three.js, R3F, Rapier, models) is one lazy chunk.
const App3D = lazy(() => import('./App3D'))

/** Picks the experience: 3D campus, 2D site, or a chooser on weak devices. */
export function Root() {
  const mode = useModeStore((s) => s.mode)

  // Restore a signed-in session from the previous visit (shared by both modes).
  useEffect(() => {
    auth.getSession().then((user) => {
      if (user) useGameStore.getState().setUser(user)
    })
  }, [])

  if (mode === 'choose') return <ModeChooser />
  if (mode === '2d') return <Site2D />
  return (
    <Suspense fallback={<LoadingView progress={null} label="Loading the 3D engine…" />}>
      <App3D />
    </Suspense>
  )
}

function ModeChooser() {
  const setMode = useModeStore((s) => s.setMode)
  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-b from-sky-200 to-emerald-100 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
        <h1 className="text-3xl font-black text-slate-900">Campus 3D</h1>
        <p className="mt-3 text-slate-600">
          This device may struggle with the 3D campus. Both versions have the same courses, games and info.
        </p>
        <div className="mt-6 grid gap-3">
          <button type="button" onClick={() => setMode('3d')} className="rounded-xl bg-sky-600 px-4 py-3 font-semibold text-white hover:bg-sky-500">
            Explore the 3D campus
          </button>
          <button type="button" onClick={() => setMode('2d')} className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-800 hover:bg-slate-50">
            Use the lightweight 2D site
          </button>
        </div>
      </div>
    </div>
  )
}
