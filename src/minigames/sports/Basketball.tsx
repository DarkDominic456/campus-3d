import { useCallback, useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { BallCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { MathUtils, Vector3, type Object3D, type Vector3Tuple } from 'three'
import { pingPong, sportRuntime, useSportStore } from './sportStore'
import { playSportPose, useSportAction } from './SportController'
import { BASKETBALL_SPOT, HOOP } from './config'

const GRAVITY = 20 // matches <Physics gravity> in World.tsx
const LAUNCH_ANGLE = (55 * Math.PI) / 180
const MAX_YAW = 0.3 // radians of aim error at the ends of the aim meter
/**
 * Sweet zones, tuned with a headless Rapier simulation of this exact hoop (same result at
 * 20/30/60 fps): shots inside both zones go in, clean or off the rim/backboard.
 */
const AIM_ZONE: [number, number] = [-0.075, 0.075]
const POWER_ZONE: [number, number] = [0.4, 0.6]
const AIM_PERIOD = 1.6
const POWER_PERIOD = 1.1
const RELOAD_S = 1.1
const BALL_RADIUS = 0.12
const RELEASE: Vector3Tuple = [BASKETBALL_SPOT[0], 2.0, BASKETBALL_SPOT[2] - 0.5]
/** Aim a touch in front of the rim center so perfect shots clear the back rim / backboard. */
const TARGET = { x: HOOP.x, y: HOOP.y, z: HOOP.z + 0.05 }
/** Ball center must cross the rim plane this close to the hoop axis to count. */
const BASKET_RADIUS = HOOP.radius - BALL_RADIUS * 0.4

const worldPos = new Vector3()

interface Shot {
  id: number
  velocity: Vector3Tuple
}

/**
 * Velocity that drops the ball through the rim center at LAUNCH_ANGLE, scaled by power
 * (0.5 = perfect) and rotated by the aim error.
 */
function shotVelocity(aim: number, power: number): Vector3Tuple {
  const dx = TARGET.x - RELEASE[0]
  const dz = TARGET.z - RELEASE[2]
  const d = Math.hypot(dx, dz)
  const h = TARGET.y - RELEASE[1]
  const ideal = Math.sqrt((GRAVITY * d * d) / (2 * Math.cos(LAUNCH_ANGLE) ** 2 * (d * Math.tan(LAUNCH_ANGLE) - h)))
  // Slightly over the ideal drop-in speed works best (the backboard helps); 0.5 ≈ center of POWER_ZONE.
  const speed = ideal * (1.075 + 0.5 * (power - 0.54))
  const yaw = aim * MAX_YAW
  const ux = dx / d
  const uz = dz / d
  const rx = ux * Math.cos(yaw) - uz * Math.sin(yaw)
  const rz = ux * Math.sin(yaw) + uz * Math.cos(yaw)
  const horizontal = speed * Math.cos(LAUNCH_ANGLE)
  return [rx * horizontal, speed * Math.sin(LAUNCH_ANGLE), rz * horizontal]
}

/**
 * Aim meter → power meter → shoot. A basket is a ball whose center crosses the rim plane
 * downward inside the ring — checked every frame by interpolating between physics positions,
 * so fast balls / low frame rates can't tunnel past a thin sensor.
 */
export function BasketballGame() {
  const active = useSportStore((s) => s.active === 'basketball')
  const phase = useSportStore((s) => s.phase)
  const run = useSportStore((s) => s.run)
  const playing = active && phase === 'playing'

  const [shots, setShots] = useState<Shot[]>([])
  const stage = useRef<'aim' | 'power' | 'wait'>('aim')
  const stageStart = useRef(0)
  const now = useRef(0)
  const lockedAim = useRef(0)
  const nextId = useRef(0)
  const rimTouched = useRef(new Set<number>())
  const scored = useRef(new Set<number>())
  /** Ball meshes (synced from physics by RigidBody); read positions here, not via the wasm body. */
  const balls = useRef(new Map<number, Object3D>())
  const lastPos = useRef(new Map<number, { x: number; y: number; z: number }>())

  useEffect(() => {
    setShots([])
    stage.current = 'aim'
    stageStart.current = now.current
    rimTouched.current.clear()
    scored.current.clear()
    lastPos.current.clear()
  }, [run, active])

  const onBasket = useCallback((id: number) => {
    scored.current.add(id)
    const { addScore, flash } = useSportStore.getState()
    if (rimTouched.current.has(id)) {
      addScore(2)
      flash('Basket! +2', 'good')
    } else {
      addScore(3)
      flash('Swish! +3', 'great')
    }
  }, [])

  useFrame(({ clock }, delta) => {
    now.current = clock.elapsedTime
    // Basket detection (runs even after time's up so a ball in the air still counts).
    for (const [id, mesh] of balls.current) {
      const p = mesh.getWorldPosition(worldPos)
            const prev = lastPos.current.get(id)
      lastPos.current.set(id, { x: p.x, y: p.y, z: p.z })
      if (!prev || scored.current.has(id) || !(prev.y >= HOOP.y && p.y < HOOP.y)) continue
      // Ballistic interpolation between the two samples: at low frame rates the ball moves far
      // per step, and a straight line would put the crossing well short of the true arc.
      const dt = Math.max(1e-3, delta)
      const vy0 = (p.y - prev.y + 0.5 * GRAVITY * dt * dt) / dt
      const disc = vy0 * vy0 - 2 * GRAVITY * (HOOP.y - prev.y)
      const tc = MathUtils.clamp(disc >= 0 ? (vy0 + Math.sqrt(disc)) / GRAVITY : dt, 0, dt)
      const x = prev.x + ((p.x - prev.x) * tc) / dt
      const z = prev.z + ((p.z - prev.z) * tc) / dt
      if (Math.hypot(x - HOOP.x, z - HOOP.z) < BASKET_RADIUS) onBasket(id)
    }
    if (!playing) return
    const t = now.current - stageStart.current
    if (stage.current === 'aim') {
      Object.assign(sportRuntime, { stage: 'aim', aim: pingPong(t, AIM_PERIOD) * 2 - 1, aimZone: AIM_ZONE, prompt: 'Lock your aim' })
    } else if (stage.current === 'power') {
      Object.assign(sportRuntime, { stage: 'power', power: pingPong(t, POWER_PERIOD), powerZone: POWER_ZONE, prompt: 'Shoot!' })
    } else {
      sportRuntime.stage = 'wait'
      sportRuntime.prompt = ''
      if (t > RELOAD_S) {
        stage.current = 'aim'
        stageStart.current = now.current
      }
    }
  })

  const onAction = useCallback(() => {
    if (stage.current === 'aim') {
      lockedAim.current = sportRuntime.aim
      stage.current = 'power'
    } else if (stage.current === 'power') {
      const id = nextId.current++
      setShots((list) => [...list.slice(-2), { id, velocity: shotVelocity(lockedAim.current, sportRuntime.power) }])
      playSportPose('jump', 450)
      stage.current = 'wait'
    } else return
    stageStart.current = now.current
  }, [])
  useSportAction(playing, onAction)

  if (!active) return null
  return (
    <>
      {shots.map((shot) => (
        <Ball
          key={shot.id}
          shot={shot}
          onRim={() => rimTouched.current.add(shot.id)}
          onMesh={(mesh) => {
            if (mesh) balls.current.set(shot.id, mesh)
            else {
              balls.current.delete(shot.id)
              lastPos.current.delete(shot.id)
            }
          }}
        />
      ))}
    </>
  )
}

/** One thrown ball; its launch velocity is applied once, right after the body exists. */
function Ball({ shot, onRim, onMesh }: { shot: Shot; onRim: () => void; onMesh: (mesh: Object3D | null) => void }) {
  const body = useRef<RapierRigidBody>(null)
  useEffect(() => {
    body.current?.setLinvel({ x: shot.velocity[0], y: shot.velocity[1], z: shot.velocity[2] }, true)
  }, [shot])

  return (
    <RigidBody
      ref={body}
      position={RELEASE}
      colliders={false}
      ccd
      userData={{ basketball: shot.id }}
      onCollisionEnter={({ other }) => {
        if (other.rigidBodyObject?.userData?.rim) onRim()
      }}
    >
      <BallCollider args={[BALL_RADIUS]} restitution={0.7} friction={0.5} density={0.5} />
      <mesh castShadow ref={onMesh}>
        <sphereGeometry args={[BALL_RADIUS, 20, 16]} />
        <meshStandardMaterial color="#ea580c" roughness={0.8} />
      </mesh>
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[BALL_RADIUS, 0.006, 6, 24]} />
        <meshStandardMaterial color="#1c1917" />
      </mesh>
    </RigidBody>
  )
}
