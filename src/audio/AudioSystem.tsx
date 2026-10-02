import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { audioListener, enableAudio, playSound, setAmbience, type SoundName } from './audio'
import { playerRuntime, RUN_SPEED, WALK_SPEED } from '../player/playerRuntime'
import { useGameStore } from '../store/useGameStore'
import { useTimeOfDay } from '../settings/settings'
import { surfaceAt } from '../world/surfaceAt'
import { INDOOR_ZONE_IDS } from '../world/zoneConfig'

/** Metres per footstep, matching the walk / run clips at their PlayerModel time scale. */
const STRIDE = { walk: 0.84, run: 1.04 }
const STEP_SOUND: Record<ReturnType<typeof surfaceAt>, SoundName> = {
  grass: 'step-grass',
  hard: 'step-hard',
  wood: 'step-wood',
  carpet: 'step-carpet',
}

const right = new Vector3()

/**
 * Mount inside the Canvas: keeps the audio listener on the camera and plays the player's
 * footsteps (by surface) and landing thumps. Also enables audio and feeds the ambience
 * (indoors / outdoors, day / night).
 */
export function AudioSystem() {
  const zone = useGameStore((s) => s.currentZone)
  const timeOfDay = useTimeOfDay()

  useEffect(() => enableAudio(), [])
  useEffect(() => setAmbience({ outdoors: !INDOOR_ZONE_IDS.has(zone) }), [zone])
  useEffect(() => setAmbience({ night: timeOfDay === 'night' }), [timeOfDay])

  const steps = useRef({ x: 0, z: 0, travelled: 0, wasGrounded: true, airTime: 0 })
  useFrame(({ camera }, delta) => {
    audioListener.x = camera.position.x
    audioListener.y = camera.position.y
    audioListener.z = camera.position.z
    right.set(1, 0, 0).applyQuaternion(camera.quaternion)
    audioListener.rightX = right.x
    audioListener.rightZ = right.z

    const s = steps.current
    const p = playerRuntime.position
    const moved = Math.hypot(p.x - s.x, p.z - s.z)
    s.x = p.x
    s.z = p.z
    const seated = useGameStore.getState().focus?.seat
    // Teleports and seats don't make footsteps.
    if (seated || moved > 1.5) {
      s.travelled = 0
      return
    }
    const grounded = playerRuntime.grounded
    const sound = STEP_SOUND[surfaceAt(p.x, p.z, useGameStore.getState().currentZone)]
    if (!grounded) s.airTime += delta
    else if (!s.wasGrounded && s.airTime > 0.25) {
      playSound(sound, { volume: 0.7, rate: 0.85 })
      s.travelled = 0
    }
    if (grounded) s.airTime = 0
    s.wasGrounded = grounded
    if (!grounded) return

    const speed = moved / Math.max(delta, 1e-3)
    if (speed < 0.5) {
      s.travelled = 0
      return
    }
    s.travelled += moved
    const running = speed > (WALK_SPEED + RUN_SPEED) / 2
    if (s.travelled >= (running ? STRIDE.run : STRIDE.walk)) {
      s.travelled = 0
      playSound(sound, { volume: running ? 0.5 : 0.35 })
    }
  })

  return null
}
