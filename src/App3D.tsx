import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { KeyboardControls, PerformanceMonitor, useProgress } from '@react-three/drei'
import { keyMap } from './player/controls'
import { World } from './world/World'
import { InteractionManager } from './interactables/InteractionManager'
import { UILayer } from './ui/UILayer'
import { ZoneTracker } from './world/ZoneTracker'
import { SportController } from './minigames/sports/SportController'
import { useGameStore } from './store/useGameStore'
import { playerRuntime, teleportTo } from './player/playerRuntime'
import { sportRuntime, useSportStore } from './minigames/sports/sportStore'
import { useSceneReady } from './world/sceneReady'
import { LoadingView } from './ui/LoadingView'
import { SlowDeviceBanner } from './ui/SlowDeviceBanner'
import { useIsTouch } from './ui/touch'

// Dev-only handle for debugging / automated browser checks (renderer is added in onCreated).
if (import.meta.env.DEV) {
  Object.assign(window, {
    __game: { store: useGameStore, playerRuntime, teleportTo, sport: { store: useSportStore, runtime: sportRuntime } },
  })
}

/** The walkable 3D campus. Lazy-loaded by Root, so the 2D site never downloads three.js / Rapier. */
export default function App3D() {
  const quality = useGameStore((s) => s.graphicsQuality)
  const setQuality = useGameStore((s) => s.setGraphicsQuality)
  const touch = useIsTouch()

  // Full-screen game mode: no page scroll, no pinch-zooming the page (pinch zooms the camera).
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
    const previous = meta?.content
    document.documentElement.classList.add('mode-3d')
    meta?.setAttribute('content', 'width=device-width, initial-scale=1.0, user-scalable=no')
    return () => {
      document.documentElement.classList.remove('mode-3d')
      if (meta && previous) meta.setAttribute('content', previous)
    }
  }, [])

  return (
    <KeyboardControls map={keyMap}>
      <Canvas
        // PCF (not PCF-soft): noticeably cheaper on integrated GPUs, looks nearly the same here.
        shadows="percentage"
        camera={{ fov: 60, near: 0.1, far: 200, position: [0, 4, 12] }}
        dpr={quality === 'high' ? [1, touch ? 1.5 : 2] : 1}
        onCreated={({ gl }) => {
          if (import.meta.env.DEV) Object.assign((window as unknown as { __game: object }).__game, { renderer: gl })
        }}
      >
        {/* Drop to low quality (DPR 1, no real-time shadows) if the frame rate keeps falling. */}
        <PerformanceMonitor onDecline={() => setQuality('low')} flipflops={3} onFallback={() => setQuality('low')} />
        <Suspense fallback={null}>
          <World />
        </Suspense>
      </Canvas>
      <InteractionManager />
      <ZoneTracker />
      <SportController />
      <UILayer />
      <LoadingScreen />
      <SlowDeviceBanner />
    </KeyboardControls>
  )
}

/** Covers the canvas until models are loaded and the first physics frame has rendered. */
function LoadingScreen() {
  const { progress, total } = useProgress()
  const ready = useSceneReady((s) => s.ready)
  const [gone, setGone] = useState(false)
  const assetsDone = total === 0 || progress >= 100
  const done = ready && assetsDone

  useEffect(() => {
    if (!done) return
    const id = window.setTimeout(() => setGone(true), 600)
    return () => window.clearTimeout(id)
  }, [done])

  if (gone) return null
  // Assets are ~90 % of the wait; the last 10 % is physics + first frame.
  const shown = done ? 100 : Math.min(99, (total === 0 ? 90 : progress * 0.9) + (ready ? 10 : 0))
  return <LoadingView progress={shown} label={assetsDone ? 'Building the campus…' : 'Loading models…'} fading={done} />
}
