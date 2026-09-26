import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { Group, MathUtils, Vector3, type Vector3Tuple } from 'three'
import { CharacterModel } from '../characters/CharacterModel'
import type { CharacterAnim } from '../characters/clips'
import type { CharacterVariant } from '../assets/models'
import { playerRuntime } from '../player/playerRuntime'
import { NPC_CULL_DISTANCE } from './StaticNpc'

const HALF_HEIGHT = 0.43
const RADIUS = 0.4
const CENTER_Y = HALF_HEIGHT + RADIUS
const ARRIVE_DISTANCE = 0.15
const TURN_SPEED = 8
/** Stop and look at the player inside this radius; resume beyond RESUME. */
const YIELD_RADIUS = 1.8
const RESUME_RADIUS = 2.4

export interface WalkingNpcProps {
  variant: CharacterVariant
  /** Waypoints at feet height. */
  path: Vector3Tuple[]
  /** 'loop' goes back to the first point; 'pingpong' walks the path back and forth. */
  mode?: 'loop' | 'pingpong'
  speed?: number
  /** Seconds to idle at each waypoint: [min, max]. */
  pause?: [number, number]
  phase?: number
}

/**
 * NPC that walks a waypoint path on a kinematic capsule (so the player bumps into it
 * instead of walking through). Yields to the player: stops and turns to face them.
 */
export function WalkingNpc({ variant, path, mode = 'loop', speed = 1.4, pause = [1, 3], phase = 0 }: WalkingNpcProps) {
  const body = useRef<RapierRigidBody>(null)
  const model = useRef<Group>(null)
  const [anim, setAnim] = useState<CharacterAnim>('walk')

  const state = useRef({
    pos: new Vector3(path[0][0], path[0][1] + CENTER_Y, path[0][2]),
    target: 1 % path.length,
    direction: 1,
    waitUntil: 0,
    yielding: false,
    facing: 0,
  })
  const tmp = useMemo(() => ({ to: new Vector3(), toPlayer: new Vector3() }), [])
  // Stable reference: a new array each render would make RigidBody re-apply its start position.
  const initialPosition = useMemo(() => state.current.pos.toArray(), [])

  useFrame(({ clock }, delta) => {
    const b = body.current
    if (!b || path.length < 2) return
    const s = state.current
    const dt = Math.min(delta, 0.1)
    const now = clock.elapsedTime
    let next: CharacterAnim = 'walk'
    let desiredFacing = s.facing

    // Yield to the player
    tmp.toPlayer.copy(playerRuntime.position).sub(s.pos)
    tmp.toPlayer.y = 0
    const playerDist = tmp.toPlayer.length()
    const sameFloor = Math.abs(playerRuntime.position.y - s.pos.y) < 2
    if (sameFloor && playerDist < (s.yielding ? RESUME_RADIUS : YIELD_RADIUS)) {
      s.yielding = true
      next = 'idle'
      desiredFacing = Math.atan2(tmp.toPlayer.x, tmp.toPlayer.z)
    } else {
      s.yielding = false
      if (now < s.waitUntil) {
        next = 'idle'
      } else {
        const [tx, ty, tz] = path[s.target]
        tmp.to.set(tx, ty + CENTER_Y, tz).sub(s.pos)
        const dist = tmp.to.length()
        if (dist < ARRIVE_DISTANCE) {
          s.waitUntil = now + MathUtils.randFloat(pause[0], pause[1])
          s.target = nextIndex(s.target, path.length, mode, s)
          next = 'idle'
        } else {
          const step = Math.min(dist, speed * dt)
          s.pos.addScaledVector(tmp.to, step / dist)
          desiredFacing = Math.atan2(tmp.to.x, tmp.to.z)
        }
      }
    }

    // Smooth turning (shortest way round)
    const diff = Math.atan2(Math.sin(desiredFacing - s.facing), Math.cos(desiredFacing - s.facing))
    s.facing += diff * (1 - Math.exp(-TURN_SPEED * dt))
    if (model.current) model.current.rotation.y = s.facing

    b.setNextKinematicTranslation(s.pos)
    if (next !== anim) setAnim(next)
  })

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={initialPosition}>
      <CapsuleCollider args={[HALF_HEIGHT, RADIUS]} />
      <group ref={model} position={[0, -CENTER_Y, 0]}>
        <CharacterModel variant={variant} animation={anim} timeScale={anim === 'walk' ? 0.6 * speed : 1} phase={phase} cullDistance={NPC_CULL_DISTANCE} />
      </group>
    </RigidBody>
  )
}

function nextIndex(i: number, n: number, mode: 'loop' | 'pingpong', s: { direction: number }) {
  if (mode === 'loop') return (i + 1) % n
  if (i + s.direction >= n || i + s.direction < 0) s.direction *= -1
  return i + s.direction
}
