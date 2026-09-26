import { useCallback, useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, MathUtils, Mesh, Vector3 } from 'three'
import { sportRuntime, useSportStore } from './sportStore'
import { playSportPose, useSportAction } from './SportController'
import { BATTER_SPOT, CRICKET } from './config'

const GRAVITY = 20
const BALL_RADIUS = 0.07
const BALLS_PER_ROUND = 12
const RELEASE_HEIGHT = 2.0
const BOUNCE = 0.55
/** Where bat meets ball: just in front of the batter. */
const HIT_Z = CRICKET.creaseZ
/** Timing windows in seconds (|early/late| from the ideal moment). */
const WINDOW = { six: 0.06, four: 0.12, edge: 0.2 }
const SWING_S = 0.25
const BAT_PIVOT: [number, number, number] = [BATTER_SPOT[0] + 0.4, 0.95, BATTER_SPOT[2] - 0.15]

type Mode = 'waiting' | 'bowled' | 'hit' | 'dead'

/**
 * Batting: 12 balls, time your swing as the ball reaches you. The ball follows a hand-rolled
 * trajectory (release → bounce → batter) so timing is consistent; no physics needed.
 */
export function CricketGame() {
  const active = useSportStore((s) => s.active === 'cricket')
  const phase = useSportStore((s) => s.phase)
  const run = useSportStore((s) => s.run)
  const playing = active && phase === 'playing'

  const ballMesh = useRef<Mesh>(null)
  const bat = useRef<Group>(null)
  const s = useRef({
    mode: 'waiting' as Mode,
    now: 0,
    nextBallAt: 0,
    modeStart: 0,
    swingStart: -10,
    swung: false,
    balls: 0,
    wickets: 0,
    pos: new Vector3(),
    vel: new Vector3(),
  })

  const updateStat = () => {
    const st = s.current
    useSportStore.getState().setStat(`Ball ${st.balls}/${BALLS_PER_ROUND} · Wickets ${st.wickets}`)
  }

  useEffect(() => {
    Object.assign(s.current, { mode: 'waiting', nextBallAt: s.current.now + 0.8, balls: 0, wickets: 0, swung: false })
    if (active) updateStat()
  }, [run, active])

  const setMode = (mode: Mode, delayNext?: number) => {
    const st = s.current
    st.mode = mode
    st.modeStart = st.now
    if (delayNext !== undefined) st.nextBallAt = st.now + delayNext
  }

  const bowl = () => {
    const st = s.current
    const x0 = CRICKET.x + MathUtils.randFloat(-0.3, 0.3)
    const vz = MathUtils.randFloat(17, 23)
    const bounceZ = HIT_Z - MathUtils.randFloat(3, 6)
    const bounceX = CRICKET.x + MathUtils.randFloat(-0.2, 0.2)
    const t1 = (bounceZ - CRICKET.bowlerZ) / vz
    st.pos.set(x0, RELEASE_HEIGHT, CRICKET.bowlerZ)
    st.vel.set((bounceX - x0) / t1, (BALL_RADIUS - RELEASE_HEIGHT + 0.5 * GRAVITY * t1 * t1) / t1, vz)
    st.swung = false
    st.balls += 1
    updateStat()
    setMode('bowled')
  }

  useFrame(({ clock }, delta) => {
    const st = s.current
    st.now = clock.elapsedTime
    const dt = Math.min(delta, 0.05)
    if (!active) return

    if (playing && st.mode === 'waiting' && st.now >= st.nextBallAt) {
      if (st.balls >= BALLS_PER_ROUND) useSportStore.getState().finish()
      else bowl()
    }

    if (st.mode === 'bowled' || st.mode === 'hit') {
      st.vel.y -= GRAVITY * dt
      st.pos.addScaledVector(st.vel, dt)
      if (st.pos.y < BALL_RADIUS && st.vel.y < 0) {
        st.pos.y = BALL_RADIUS
        st.vel.y = -st.vel.y * BOUNCE
        if (st.mode === 'hit') st.vel.multiplyScalar(0.8) // grass slows it down
      }
    }

    if (st.mode === 'bowled') {
      sportRuntime.stage = 'wait'
      sportRuntime.prompt = st.swung ? '' : 'Swing!'
      sportRuntime.eta = (HIT_Z - st.pos.z) / st.vel.z
      if (st.pos.z >= CRICKET.stumpsZ) {
        const hitStumps = Math.abs(st.pos.x - CRICKET.x) < 0.14 && st.pos.y < 0.75
        if (hitStumps) {
          st.wickets += 1
          updateStat()
          useSportStore.getState().flash('Bowled!', 'bad')
        } else if (!st.swung) useSportStore.getState().flash('Dot ball', 'bad')
        setMode('dead', 1.4)
      }
    } else sportRuntime.eta = null
    if (st.mode === 'hit' && st.now - st.modeStart > 2.2) {
      setMode('dead', 0.6)
    } else if (st.mode === 'dead' && st.now >= st.nextBallAt) {
      setMode('waiting')
      st.nextBallAt = st.now + 0.4
    } else if (st.mode === 'waiting') {
      sportRuntime.stage = 'wait'
      sportRuntime.prompt = playing ? 'Get ready…' : ''
    }

    if (ballMesh.current) {
      ballMesh.current.visible = st.mode === 'bowled' || st.mode === 'hit'
      ballMesh.current.position.copy(st.pos)
    }

    // Bat: stance → quick horizontal swing → back to stance.
    if (bat.current) {
      const p = MathUtils.clamp((st.now - st.swingStart) / SWING_S, 0, 1)
      const back = MathUtils.clamp((st.now - st.swingStart - 0.6) / 0.3, 0, 1)
      const swing = p * (1 - back)
      bat.current.rotation.set(0.35 * (1 - swing), MathUtils.lerp(-0.4, 2.6, swing), MathUtils.lerp(0.15, 1.45, swing), 'YXZ')
    }
  })

  const onAction = useCallback(() => {
    const st = s.current
    if (st.mode !== 'bowled' || st.swung) return
    st.swung = true
    st.swingStart = st.now
    playSportPose('talk', 500)
    const error = Math.abs((HIT_Z - st.pos.z) / st.vel.z)
    if (error > WINDOW.edge) return // swing and a miss — the ball carries on to the stumps

    const { addScore, flash } = useSportStore.getState()
    const angle = MathUtils.randFloat(-0.9, 0.9) // around straight back past the bowler (−Z)
    let speed: number
    let lift: number
    if (error <= WINDOW.six) {
      addScore(6)
      flash('SIX!', 'great')
      speed = 28
      lift = 13
    } else if (error <= WINDOW.four) {
      addScore(4)
      flash('FOUR!', 'good')
      speed = 24
      lift = 2.5
    } else {
      const runs = Math.random() < 0.5 ? 1 : 2
      addScore(runs)
      flash(`Edged — ${runs} run${runs > 1 ? 's' : ''}`, 'good')
      speed = 11
      lift = 4
    }
    st.vel.set(Math.sin(angle) * speed, lift, -Math.cos(angle) * speed)
    st.mode = 'hit'
    st.modeStart = st.now
  }, [])
  useSportAction(playing, onAction)

  if (!active) return null
  return (
    <>
      <mesh ref={ballMesh} castShadow visible={false}>
        <sphereGeometry args={[BALL_RADIUS, 16, 12]} />
        <meshStandardMaterial color="#b91c1c" />
      </mesh>
      {/* Bat pivots at the batter's hands; the blade hangs below the pivot. */}
      <group ref={bat} position={BAT_PIVOT}>
        <mesh position={[0, -0.45, 0]} castShadow>
          <boxGeometry args={[0.11, 0.62, 0.04]} />
          <meshStandardMaterial color="#e7c07a" />
        </mesh>
        <mesh position={[0, -0.08, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      </group>
    </>
  )
}
