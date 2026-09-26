import { useEffect, useRef } from 'react'
import { create } from 'zustand'
import { useFrame, useThree } from '@react-three/fiber'
import type { Vector3Tuple } from 'three'
import { teleportTo } from '../player/playerRuntime'
import { useGameStore } from '../store/useGameStore'
import { useSceneReady } from './sceneReady'
import { FLOOR1_Y } from './layout'

/** Fixed camera spots for comparable numbers across changes. */
const SPOTS: [string, Vector3Tuple, number][] = [
  ['gate', [0, 0.9, 38], Math.PI],
  ['plaza', [0, 0.9, 18], Math.PI],
  ['hall', [-1, 0.9, 8], Math.PI],
  ['classroom', [-5.5, 0.9, 1], -Math.PI / 2],
  ['office', [-12, FLOOR1_Y + 0.9, 4], -Math.PI * 0.75],
  ['outdoor', [0, 0.9, -20], Math.PI],
  ['basketball', [-30, 0.9, -36], Math.PI],
]
const SETTLE_MS = 1500
const SAMPLE_MS = 3000

export interface BenchRow {
  spot: string
  fps: number
  calls: number
  triangles: number
}

export const benchEnabled = () => new URLSearchParams(location.search).get('bench') === '1'

const useBenchStore = create<{ rows: BenchRow[]; done: boolean }>()(() => ({ rows: [], done: false }))

/**
 * `?bench=1`: after loading, visits each spot, measures fps / draw calls / triangles and
 * prints a table (on screen via <BenchTable>, `console.table`, and `window.__bench`).
 * Use it before and after performance changes. Mount inside the Canvas.
 */
export function Bench() {
  const gl = useThree((s) => s.gl)
  const ready = useSceneReady((s) => s.ready)
  const sample = useRef<{ frames: number; calls: number; tris: number } | null>(null)

  useFrame(() => {
    const s = sample.current
    if (!s) return
    s.frames++
    s.calls = Math.max(s.calls, gl.info.render.calls)
    s.tris = Math.max(s.tris, gl.info.render.triangles)
  })

  useEffect(() => {
    if (!ready) return
    let cancelled = false
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
    ;(async () => {
      useGameStore.getState().setShowControlsHint(false)
      const results: BenchRow[] = []
      for (const [name, position, facing] of SPOTS) {
        teleportTo(position, facing)
        await wait(SETTLE_MS)
        sample.current = { frames: 0, calls: 0, tris: 0 }
        const t0 = performance.now()
        await wait(SAMPLE_MS)
        const s = sample.current
        sample.current = null
        if (cancelled) return
        results.push({ spot: name, fps: Math.round((s.frames * 1000) / (performance.now() - t0)), calls: s.calls, triangles: s.tris })
        useBenchStore.setState({ rows: [...results] })
      }
      console.table(results)
      Object.assign(window, { __bench: results })
      useBenchStore.setState({ done: true })
    })()
    return () => {
      cancelled = true
    }
  }, [ready])

  return null
}

/** DOM results table for the benchmark — mount outside the Canvas. */
export function BenchTable() {
  const { rows, done } = useBenchStore()
  return (
    <div className="fixed top-16 left-3 z-[200] rounded-xl bg-slate-900/90 p-3 font-mono text-xs text-slate-100 shadow-xl" data-bench={done ? 'done' : 'running'}>
      <div className="mb-1 font-bold">Benchmark {done ? '(done)' : '(running…)'}</div>
      <table>
        <thead>
          <tr className="text-slate-400">
            <th className="pr-3 text-left">spot</th>
            <th className="pr-3 text-right">fps</th>
            <th className="pr-3 text-right">calls</th>
            <th className="text-right">tris</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.spot}>
              <td className="pr-3">{r.spot}</td>
              <td className="pr-3 text-right">{r.fps}</td>
              <td className="pr-3 text-right">{r.calls}</td>
              <td className="text-right">{r.triangles.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
