import { useEffect, useState } from 'react'
import { useModeStore } from '../mode/mode'
import { useSceneReady } from '../world/sceneReady'

const SETTLE_MS = 3000
const SAMPLE_MS = 6000
const MIN_FPS = 20

/**
 * Once the scene is up, measures the real frame rate for a few seconds. If it stays below
 * MIN_FPS (even after PerformanceMonitor lowered the quality), offers the 2D site.
 */
export function SlowDeviceBanner() {
  const ready = useSceneReady((s) => s.ready)
  const setMode = useModeStore((s) => s.setMode)
  const [fps, setFps] = useState<number | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!ready) return
    let raf = 0
    let frames = 0
    let start = 0
    const settle = window.setTimeout(() => {
      start = performance.now()
      const tick = () => {
        frames++
        const elapsed = performance.now() - start
        if (elapsed < SAMPLE_MS) raf = requestAnimationFrame(tick)
        else setFps(Math.round((frames * 1000) / elapsed))
      }
      raf = requestAnimationFrame(tick)
    }, SETTLE_MS)
    return () => {
      window.clearTimeout(settle)
      cancelAnimationFrame(raf)
    }
  }, [ready])

  if (dismissed || fps === null || fps >= MIN_FPS) return null
  return (
    <div className="fixed inset-x-0 bottom-20 z-40 flex justify-center px-4" role="alert">
      <div className="flex max-w-md flex-wrap items-center gap-3 rounded-2xl bg-white p-4 text-sm text-slate-800 shadow-2xl ring-1 ring-slate-200">
        <p className="flex-1">
          3D is running slowly on this device (~{fps} fps). Switch to the lighter 2D version? It has the same courses, games and info.
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setMode('2d')} className="rounded-lg bg-sky-600 px-3 py-1.5 font-semibold text-white hover:bg-sky-500">
            Switch to 2D
          </button>
          <button type="button" onClick={() => setDismissed(true)} className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold hover:bg-slate-50">
            Keep 3D
          </button>
        </div>
      </div>
    </div>
  )
}
