import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useGameStore, type PlayerAnimation } from '../../store/useGameStore'
import { scores } from '../../services/scores'
import { displayName } from '../../services/auth'
import { resetRuntime, useSportStore, type SportId } from './sportStore'
import { SPORTS, sportFocusId } from './config'

/** Walk up to a sport spot: lock the player in place, frame the camera, start the countdown. */
export function startSport(id: SportId) {
  const spec = SPORTS[id]
  resetRuntime()
  useGameStore.getState().enterFocus({
    id: sportFocusId(id),
    camera: spec.camera,
    seat: { position: spec.spot, facing: spec.facing, animation: 'idle' },
    hint: spec.controls,
  })
  useSportStore.getState().start(id)
}

/** Briefly play a pose on the player (shot, kick, swing), then return to idle. */
export function playSportPose(animation: PlayerAnimation, ms = 500) {
  const setPose = (anim: PlayerAnimation) => {
    const { focus, enterFocus } = useGameStore.getState()
    if (focus?.seat) enterFocus({ ...focus, seat: { ...focus.seat, animation: anim } })
  }
  setPose(animation)
  window.setTimeout(() => setPose('idle'), ms)
}

/**
 * Round lifecycle for whichever sport is active: 3-2-1 countdown → timed play → submit the
 * score. Also ends the sport when the player leaves focus (Esc). Mount once, outside the canvas.
 */
export function SportController() {
  const active = useSportStore((s) => s.active)
  const phase = useSportStore((s) => s.phase)
  const run = useSportStore((s) => s.run)

  // Leaving the spot (Esc / focus change) stops the sport.
  useEffect(
    () =>
      useGameStore.subscribe((g) => {
        const s = useSportStore.getState()
        if (s.active && g.focus?.id !== sportFocusId(s.active)) {
          s.stop()
          resetRuntime()
        }
      }),
    [],
  )

  useEffect(() => {
    if (!active || phase !== 'countdown') return
    const id = window.setInterval(() => {
      const s = useSportStore.getState()
      if (s.countdown <= 1) useSportStore.setState({ phase: 'playing', countdown: 0, timeLeft: SPORTS[active].duration })
      else useSportStore.setState({ countdown: s.countdown - 1 })
    }, 1000)
    return () => window.clearInterval(id)
  }, [active, phase, run])

  useEffect(() => {
    if (!active || phase !== 'playing') return
    const startedAt = performance.now()
    const duration = SPORTS[active].duration
    const id = window.setInterval(() => {
      const left = Math.max(0, duration - (performance.now() - startedAt) / 1000)
      useSportStore.setState({ timeLeft: left })
      if (left <= 0) useSportStore.getState().finish()
    }, 100)
    return () => window.clearInterval(id)
  }, [active, phase, run])

  useEffect(() => {
    if (!active || phase !== 'over') return
    resetRuntime()
    const { score } = useSportStore.getState()
    const user = useGameStore.getState().user
    scores
      .submit({ gameId: active, userId: user?.id ?? 'guest', name: displayName(user), score })
      .then((r) => {
        if (useSportStore.getState().run === run) useSportStore.setState({ result: { ...r, score } })
      })
  }, [active, phase, run])

  return null
}

/**
 * Calls `onAction` on Space / Enter or a left click on the 3D view while `enabled`.
 * Use inside the Canvas.
 */
export function useSportAction(enabled: boolean, onAction: () => void) {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) {
        e.preventDefault()
        onAction()
      }
    }
    const onPointer = (e: PointerEvent) => {
      if (e.button === 0) onAction()
    }
    window.addEventListener('keydown', onKey)
    gl.domElement.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      gl.domElement.removeEventListener('pointerdown', onPointer)
    }
  }, [enabled, onAction, gl])
}
