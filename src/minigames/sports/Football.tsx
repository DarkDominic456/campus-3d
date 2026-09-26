import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BallCollider,
  CuboidCollider,
  RigidBody,
  type IntersectionEnterPayload,
  type RapierRigidBody,
} from '@react-three/rapier'
import type { Group, Mesh, Vector3Tuple } from 'three'
import { CharacterModel } from '../../characters/CharacterModel'
import type { CharacterAnim } from '../../characters/clips'
import { pingPong, sportRuntime, useSportStore } from './sportStore'
import { playSportPose, useSportAction } from './SportController'
import { GOAL, PENALTY_SPOT } from './config'

const GRAVITY = 20
const BALL_RADIUS = 0.11
const BALL_START: Vector3Tuple = [PENALTY_SPOT[0], BALL_RADIUS, PENALTY_SPOT[2] - 0.7]
const SHOT_SPEED = 24 // horizontal m/s
const AIM_HALF_WIDTH = 3.3
const MIN_HEIGHT = 0.2
const HEIGHT_RANGE = 2.9 // power 1 → well over the bar
const AIM_PERIOD = 1.8
const POWER_PERIOD = 1.2
const RESOLVE_AFTER_S = 2.2
const NEXT_KICK_S = 1.3

const KEEPER = { z: GOAL.z + 0.5, halfWidth: 0.6, halfHeight: 0.95, speed: 8.5, reaction: 0.12, guessChance: 0.45 }

type Stage = 'aim' | 'power' | 'flight' | 'result'

/** Penalty shoot-out: aim across the goal, power sets the height, beat the keeper. */
export function FootballGame() {
  const active = useSportStore((s) => s.active === 'football')
  const phase = useSportStore((s) => s.phase)
  const run = useSportStore((s) => s.run)
  const playing = active && phase === 'playing'

  const ball = useRef<RapierRigidBody>(null)
  const keeperBody = useRef<RapierRigidBody>(null)
  const reticle = useRef<Mesh>(null)
  const keeperModel = useRef<Group>(null)
  const [ballKey, setBallKey] = useState(0)
  const [keeperAnim, setKeeperAnim] = useState<CharacterAnim>('idle')

  const s = useRef({
    stage: 'aim' as Stage,
    stageStart: 0,
    now: 0,
    tx: 0,
    ty: 1.2,
    keeperX: 0,
    keeperTarget: 0,
    keeperJump: 0,
    touchedKeeper: false,
    resolved: false,
  })

  const resetKick = useCallback(() => {
    Object.assign(s.current, { stage: 'aim', stageStart: s.current.now, keeperTarget: 0, keeperJump: 0, touchedKeeper: false, resolved: false })
    setBallKey((k) => k + 1)
    setKeeperAnim('idle')
  }, [])

  useEffect(() => {
    if (active) resetKick()
  }, [run, active, resetKick])

  const resolve = useCallback(
    (outcome: 'goal' | 'saved' | 'miss') => {
      const st = s.current
      if (st.resolved) return
      st.resolved = true
      st.stage = 'result'
      st.stageStart = st.now
      const { addScore, flash } = useSportStore.getState()
      if (outcome === 'goal') {
        addScore(1)
        flash('GOAL!', 'great')
      } else flash(outcome === 'saved' ? 'Saved!' : 'Missed!', 'bad')
    },
    [],
  )

  useFrame(({ clock }, delta) => {
    const st = s.current
    st.now = clock.elapsedTime
    if (!active) return
    const t = st.now - st.stageStart
    const dt = Math.min(delta, 0.05)

    if (playing && st.stage === 'aim') {
      const aim = pingPong(t, AIM_PERIOD) * 2 - 1
      st.tx = aim * AIM_HALF_WIDTH
      st.ty = 1.2
      Object.assign(sportRuntime, { stage: 'aim', aim, aimZone: null, prompt: 'Pick your spot' })
    } else if (playing && st.stage === 'power') {
      const power = pingPong(t, POWER_PERIOD)
      st.ty = MIN_HEIGHT + power * HEIGHT_RANGE
      const overBar = (GOAL.height - 0.15 - MIN_HEIGHT) / HEIGHT_RANGE
      Object.assign(sportRuntime, { stage: 'power', power, powerZone: [0.05, overBar], prompt: 'Shoot! (too much power goes over)' })
    } else {
      sportRuntime.stage = 'wait'
      sportRuntime.prompt = ''
    }

    // Keeper: sway while you aim, dive after the kick.
    if (st.stage === 'aim' || st.stage === 'power') {
      st.keeperX = Math.sin(st.now * 1.4) * 0.5
    } else if (st.stage === 'flight' && t > KEEPER.reaction) {
      const diff = st.keeperTarget - st.keeperX
      st.keeperX += Math.sign(diff) * Math.min(Math.abs(diff), KEEPER.speed * dt)
      st.keeperJump = Math.min(st.keeperJump + dt * 3, st.ty > 1.5 ? 0.6 : 0.15)
    }
    keeperBody.current?.setNextKinematicTranslation({ x: st.keeperX, y: KEEPER.halfHeight + st.keeperJump, z: KEEPER.z })
    if (keeperModel.current) keeperModel.current.position.y = -KEEPER.halfHeight

    if (reticle.current) {
      reticle.current.visible = playing && (st.stage === 'aim' || st.stage === 'power')
      reticle.current.position.set(st.tx, st.ty, GOAL.z + 0.05)
    }

    if (st.stage === 'flight' && t > RESOLVE_AFTER_S) resolve(st.touchedKeeper ? 'saved' : 'miss')
    if (st.stage === 'result' && t > NEXT_KICK_S && playing) resetKick()
  })

  const onAction = useCallback(() => {
    const st = s.current
    if (st.stage === 'aim') {
      st.stage = 'power'
      st.stageStart = st.now
    } else if (st.stage === 'power') {
      // Velocity that reaches (tx, ty) on the goal line at SHOT_SPEED horizontally.
      const dx = st.tx - BALL_START[0]
      const dz = GOAL.z - BALL_START[2]
      const d = Math.hypot(dx, dz)
      const time = d / SHOT_SPEED
      const vy = (st.ty - BALL_START[1] + 0.5 * GRAVITY * time * time) / time
      ball.current?.setLinvel({ x: (dx / d) * SHOT_SPEED, y: vy, z: (dz / d) * SHOT_SPEED }, true)
      // Keeper guesses: sometimes right, otherwise a random spot.
      st.keeperTarget = Math.random() < KEEPER.guessChance ? st.tx : (Math.random() * 2 - 1) * 3
      st.stage = 'flight'
      st.stageStart = st.now
      setKeeperAnim(st.ty > 1.5 ? 'jump' : 'run')
      playSportPose('run', 350)
    }
  }, [])
  useSportAction(playing, onAction)

  const onGoalSensor = useCallback(
    (p: IntersectionEnterPayload) => {
      if (p.other.rigidBodyObject?.userData?.football) resolve('goal')
    },
    [resolve],
  )

  if (!active) return null
  return (
    <>
      <CuboidCollider sensor position={[0, GOAL.height / 2, GOAL.z - 1]} args={[GOAL.halfWidth - 0.05, GOAL.height / 2 - 0.02, 0.8]} onIntersectionEnter={onGoalSensor} />

      <RigidBody
        key={ballKey}
        ref={ball}
        position={BALL_START}
        colliders={false}
        ccd
        angularDamping={0.5}
        userData={{ football: true }}
        onCollisionEnter={({ other }) => {
          if (other.rigidBodyObject?.userData?.keeper) s.current.touchedKeeper = true
        }}
      >
        <BallCollider args={[BALL_RADIUS]} restitution={0.55} friction={0.8} density={0.4} />
        <mesh castShadow>
          <icosahedronGeometry args={[BALL_RADIUS, 1]} />
          <meshStandardMaterial color="#f8fafc" flatShading />
        </mesh>
      </RigidBody>

      <RigidBody ref={keeperBody} type="kinematicPosition" colliders={false} position={[0, KEEPER.halfHeight, KEEPER.z]} userData={{ keeper: true }}>
        <CuboidCollider args={[KEEPER.halfWidth, KEEPER.halfHeight, 0.25]} />
        <group ref={keeperModel}>
          <Suspense fallback={null}>
            <CharacterModel variant="female-e" animation={keeperAnim} />
          </Suspense>
        </group>
      </RigidBody>

      <mesh ref={reticle}>
        <ringGeometry args={[0.18, 0.26, 32]} />
        <meshBasicMaterial color="#facc15" transparent opacity={0.9} depthTest={false} />
      </mesh>
    </>
  )
}
