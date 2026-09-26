import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import { MathUtils, Vector3 } from 'three'
import { playerRuntime, SPAWN_FACING } from './playerRuntime'
import { isInputLocked, useGameStore, type CameraShot } from '../store/useGameStore'

const HEAD_OFFSET = 0.6 // look-at point above capsule center
const MIN_DISTANCE = 2
const MAX_DISTANCE = 10
const DEFAULT_DISTANCE = 5.5
const MIN_PITCH = MathUtils.degToRad(-10)
const MAX_PITCH = MathUtils.degToRad(70)
const DEFAULT_PITCH = MathUtils.degToRad(20)
const ROTATE_SPEED = 0.005 // radians per pixel dragged
const ZOOM_SPEED = 0.005
const FOLLOW_DAMPING = 14
const ZOOM_DAMPING = 10
const CAMERA_RADIUS = 0.3 // sphere swept from head to camera; > near plane so corners never clip
const MIN_CLEARANCE = 0.4
/** Seconds to glide between the orbit camera and a focus shot (sit / screen). */
const SHOT_BLEND_TIME = 0.8

/**
 * Orbit-style third-person camera: drag to rotate, scroll or pinch to zoom.
 * Sweeps a small sphere from the player's head to the desired camera position and
 * pulls the camera in when something is in the way, so it never clips through walls.
 */
export function ThirdPersonCamera() {
  const gl = useThree((s) => s.gl)
  const { world, rapier } = useRapier()

  const orbit = useRef({
    yaw: SPAWN_FACING + Math.PI, // 0 = camera sits on +Z of the player, looking toward -Z
    pitch: DEFAULT_PITCH,
    targetDistance: DEFAULT_DISTANCE,
    distance: DEFAULT_DISTANCE,
  })
  const tmp = useRef({
    focus: new Vector3().copy(playerRuntime.position),
    desiredFocus: new Vector3(),
    dir: new Vector3(),
    orbitPos: new Vector3(),
    shotPos: new Vector3(),
    shotTarget: new Vector3(),
    lookTarget: new Vector3(),
  })
  /** 0 = orbit camera, 1 = focus shot. `lastShot` is kept so we can blend back out. */
  const shotBlend = useRef({ t: 0, lastShot: null as CameraShot | null })
  const probe = useRef({ shape: new rapier.Ball(CAMERA_RADIUS), rotation: { x: 0, y: 0, z: 0, w: 1 } })

  useEffect(() => {
    const el = gl.domElement
    // Active pointers on the canvas: one = drag to rotate, two = pinch to zoom (touch).
    const pointers = new Map<number, { x: number; y: number }>()
    let pinch: { startGap: number; startDistance: number } | null = null
    const gap = () => {
      const [a, b] = [...pointers.values()]
      return Math.hypot(a.x - b.x, a.y - b.y)
    }

    const onDown = (e: PointerEvent) => {
      if (isInputLocked()) return
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      el.setPointerCapture(e.pointerId)
      if (pointers.size === 2) pinch = { startGap: Math.max(1, gap()), startDistance: orbit.current.targetDistance }
    }
    const onMove = (e: PointerEvent) => {
      const last = pointers.get(e.pointerId)
      if (!last) return
      const o = orbit.current
      if (pointers.size === 1) {
        o.yaw -= (e.clientX - last.x) * ROTATE_SPEED
        o.pitch = MathUtils.clamp(o.pitch + (e.clientY - last.y) * ROTATE_SPEED, MIN_PITCH, MAX_PITCH)
      }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.size === 2 && pinch) {
        o.targetDistance = MathUtils.clamp((pinch.startDistance * pinch.startGap) / Math.max(1, gap()), MIN_DISTANCE, MAX_DISTANCE)
      }
    }
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      if (pointers.size < 2) pinch = null
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (isInputLocked()) return
      const o = orbit.current
      o.targetDistance = MathUtils.clamp(o.targetDistance + e.deltaY * ZOOM_SPEED, MIN_DISTANCE, MAX_DISTANCE)
    }
    const onContextMenu = (e: Event) => e.preventDefault()

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('contextmenu', onContextMenu)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('contextmenu', onContextMenu)
    }
  }, [gl])

  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 1 / 20)
    const o = orbit.current
    const { focus, desiredFocus, dir, orbitPos, shotPos, shotTarget, lookTarget } = tmp.current

    desiredFocus.copy(playerRuntime.position)
    desiredFocus.y += HEAD_OFFSET

    const snap = playerRuntime.cameraSnap
    if (snap) {
      // After a teleport: jump straight behind the player instead of gliding across the map.
      playerRuntime.cameraSnap = null
      o.yaw = snap.facing + Math.PI
      o.pitch = DEFAULT_PITCH
      o.distance = o.targetDistance
      focus.copy(desiredFocus)
    } else {
      focus.lerp(desiredFocus, 1 - Math.exp(-FOLLOW_DAMPING * dt))
    }

    dir.set(
      Math.sin(o.yaw) * Math.cos(o.pitch),
      Math.sin(o.pitch),
      Math.cos(o.yaw) * Math.cos(o.pitch),
    )

    // Camera collision: shorten the boom if geometry is between head and camera.
    let allowed = o.targetDistance
    const hit = world.castShape(
      focus,
      probe.current.rotation,
      dir, // unit direction, so time of impact = distance travelled
      probe.current.shape,
      0,
      o.targetDistance,
      false, // ignore geometry the sphere already overlaps at the head
      rapier.QueryFilterFlags.EXCLUDE_SENSORS,
      undefined,
      undefined,
      playerRuntime.body ?? undefined,
    )
    if (hit) allowed = Math.max(MIN_CLEARANCE, hit.time_of_impact)

    // Snap in instantly when blocked, ease back out when clear.
    if (allowed < o.distance) o.distance = allowed
    else o.distance = MathUtils.lerp(o.distance, allowed, 1 - Math.exp(-ZOOM_DAMPING * dt))

    orbitPos.copy(focus).addScaledVector(dir, o.distance)

    // Blend toward / away from a focus shot (seated laptop view, presentation screen).
    const b = shotBlend.current
    const shot = useGameStore.getState().focus?.camera ?? null
    if (shot) b.lastShot = shot
    b.t = MathUtils.clamp(b.t + (shot ? dt : -dt) / SHOT_BLEND_TIME, 0, 1)
    playerRuntime.cameraTooClose = false
    if (b.t > 0 && b.lastShot) {
      const e = b.t * b.t * (3 - 2 * b.t) // smoothstep
      shotPos.set(...b.lastShot.position)
      shotTarget.set(...b.lastShot.target)
      camera.position.lerpVectors(orbitPos, shotPos, e)
      lookTarget.lerpVectors(focus, shotTarget, e)
      camera.lookAt(lookTarget)
    } else {
      camera.position.copy(orbitPos)
      // Against a wall the camera can end up inside the (big) head — hide the model instead.
      playerRuntime.cameraTooClose = o.distance < 0.9
      camera.lookAt(focus)
    }
  })

  return null
}
