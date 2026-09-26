import { CuboidCollider } from '@react-three/rapier'
import { Suspense } from 'react'
import { Block } from '../parts/Block'
import { StaticNpc } from '../../npc/StaticNpc'
import { BoxColliders } from '../parts/BoxColliders'
import { Floor, SignPost } from '../parts/Props'
import { Interactable } from '../../interactables/Interactable'
import { startSport } from '../../minigames/sports/SportController'
import { useSportStore } from '../../minigames/sports/sportStore'
import { BasketballGame } from '../../minigames/sports/Basketball'
import { FootballGame } from '../../minigames/sports/Football'
import { CricketGame } from '../../minigames/sports/Cricket'
import { HOOP } from '../../minigames/sports/config'
import type { ColliderBox } from '../parts/BoxColliders'
import { COURTS } from '../layout'

const LINE = '#f8fafc'
const LINE_W = 0.1

/** 12 small boxes around the rim so the ball can bounce off it (tagged `rim` for swish detection). */
const RIM_SEGMENTS = 12
const RIM_BOXES: ColliderBox[] = Array.from({ length: RIM_SEGMENTS }, (_, i) => {
  const a = (i / RIM_SEGMENTS) * Math.PI * 2
  const r = HOOP.radius + 0.01
  return {
    position: [HOOP.x + Math.cos(a) * r, HOOP.y, HOOP.z + Math.sin(a) * r],
    size: [0.04, 0.04, (2 * Math.PI * r) / RIM_SEGMENTS + 0.02],
    rotationY: -a, // long axis tangent to the circle
  }
})

/**
 * Sports area behind the building. Lazy-loaded (see World.tsx). Each court's interactable
 * starts its 3D mini game (minigames/sports) right there.
 */
export function OutdoorGround() {
  return (
    <group>
      <BasketballCourt />
      <FootballPitch />
      <CricketGround />
    </group>
  )
}

/** A standing NPC with a collider (players on the courts). */
function Athlete(props: Parameters<typeof StaticNpc>[0]) {
  const [x, y, z] = props.position
  return (
    <>
      <BoxColliders boxes={[{ position: [x, y + 0.9, z], size: [0.7, 1.8, 0.7] }]} />
      <Suspense fallback={null}>
        <StaticNpc {...props} />
      </Suspense>
    </>
  )
}

function BasketballCourt() {
  const { cx, cz, w, d, hoopZ } = COURTS.basketball
  return (
    <group>
      <Athlete variant="male-b" position={[cx + 4, 0, hoopZ + 5]} facing={-2.4} animation="wave" />
      <Floor position={[cx, 0.02, cz]} size={[w, d]} color="#c2410c" />
      <Floor position={[cx, 0.025, cz]} size={[w - 0.6, d - 0.6]} color="#ea580c" />
      {/* Key + free-throw line */}
      <Floor position={[cx, 0.03, hoopZ + 3.2]} size={[4.9, LINE_W]} color={LINE} />
      <Floor position={[cx - 2.45, 0.03, hoopZ + 1.6]} size={[LINE_W, 3.2]} color={LINE} />
      <Floor position={[cx + 2.45, 0.03, hoopZ + 1.6]} size={[LINE_W, 3.2]} color={LINE} />
      {/* Hoop: pole, arm, backboard, ring */}
      <Block position={[cx, 1.75, hoopZ - 1.2]} size={[0.2, 3.5, 0.2]} color="#334155" />
      <Block position={[cx, 3.4, hoopZ - 0.65]} size={[0.12, 0.12, 1.1]} color="#334155" />
      <Block position={[cx, 3.35, hoopZ - 0.1]} size={[1.8, 1.05, 0.06]} color="#f8fafc" />
      <mesh position={[cx, 3.05, hoopZ + 0.2]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.23, 0.02, 8, 24]} />
        <meshStandardMaterial color="#f97316" />
      </mesh>
      <BoxColliders boxes={RIM_BOXES} userData={{ rim: true }} />
      <SignPost text="BASKETBALL" position={[cx + w / 2 - 1, 0, cz + d / 2 + 1]} color="#c2410c" />
      <Interactable
        id="sport-basketball"
        prompt="Press E to play basketball"
        position={[cx, 0, hoopZ + 4.5]}
        triggerSize={[1.2, 1.2, 1.2]}
        onInteract={() => startSport('basketball')}
      />
      <BasketballGame />
    </group>
  )
}

function FootballPitch() {
  const { cx, cz, w, d, goalZ } = COURTS.football
  const goalW = 7.3
  const goalH = 2.44
  const penaltyActive = useSportStore((s) => s.active === 'football')
  return (
    <group>
      <Floor position={[cx, 0.02, cz]} size={[w, d]} color="#4ade80" />
      {/* Stripes */}
      {Array.from({ length: 6 }, (_, i) => (
        <Floor key={i} position={[cx, 0.022, cz - d / 2 + d / 12 + (i * d) / 6]} size={[w, d / 12]} color="#22c55e" />
      ))}
      {/* Outline + halfway + penalty box */}
      <Floor position={[cx, 0.03, cz - d / 2]} size={[w, LINE_W]} color={LINE} />
      <Floor position={[cx, 0.03, cz + d / 2]} size={[w, LINE_W]} color={LINE} />
      <Floor position={[cx - w / 2, 0.03, cz]} size={[LINE_W, d]} color={LINE} />
      <Floor position={[cx + w / 2, 0.03, cz]} size={[LINE_W, d]} color={LINE} />
      <Floor position={[cx, 0.03, cz]} size={[w, LINE_W]} color={LINE} />
      <Floor position={[cx, 0.03, goalZ + 8]} size={[14, LINE_W]} color={LINE} />
      <Floor position={[cx - 7, 0.03, goalZ + 4]} size={[LINE_W, 8]} color={LINE} />
      <Floor position={[cx + 7, 0.03, goalZ + 4]} size={[LINE_W, 8]} color={LINE} />
      {/* Goal frame */}
      <Block position={[cx - goalW / 2, goalH / 2, goalZ]} size={[0.12, goalH, 0.12]} color={LINE} />
      <Block position={[cx + goalW / 2, goalH / 2, goalZ]} size={[0.12, goalH, 0.12]} color={LINE} />
      <Block position={[cx, goalH, goalZ]} size={[goalW + 0.12, 0.12, 0.12]} color={LINE} />
      <mesh position={[cx, goalH / 2, goalZ - 1]}>
        <boxGeometry args={[goalW, goalH, 2]} />
        <meshStandardMaterial color="#e2e8f0" wireframe />
      </mesh>
      {/* Net: invisible back/sides/top so shots stop in the goal */}
      <BoxColliders
        boxes={[
          { position: [cx, goalH / 2, goalZ - 2], size: [goalW, goalH, 0.1] },
          { position: [cx - goalW / 2, goalH / 2, goalZ - 1], size: [0.1, goalH, 2] },
          { position: [cx + goalW / 2, goalH / 2, goalZ - 1], size: [0.1, goalH, 2] },
          { position: [cx, goalH, goalZ - 1], size: [goalW, 0.1, 2] },
        ]}
      />
      {/* Idle keeper; the penalty game swaps in its own moving keeper */}
      {!penaltyActive && <Athlete variant="female-e" position={[cx, 0, goalZ + 0.6]} facing={0} animation="idle" />}
      <SignPost text="FOOTBALL" position={[cx + w / 2 + 1.5, 0, cz + d / 2 - 1]} color="#15803d" />
      <Interactable
        id="sport-football"
        prompt="Press E to take a penalty"
        position={[cx, 0, goalZ + 11]}
        triggerSize={[1.2, 1.2, 1.2]}
        onInteract={() => startSport('football')}
      />
      <FootballGame />
    </group>
  )
}

function CricketGround() {
  const { cx, cz, r } = COURTS.cricket
  const pitchLen = 20
  const creaseZ = cz + pitchLen / 2 - 1.2
  return (
    <group>
      <mesh position={[cx, 0.02, cz]} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[r, 48]} />
        <meshStandardMaterial color="#86efac" />
      </mesh>
      <Floor position={[cx, 0.025, cz]} size={[3, pitchLen]} color="#d6c7a1" />
      <Floor position={[cx, 0.03, creaseZ]} size={[3, LINE_W]} color={LINE} />
      <Floor position={[cx, 0.03, cz - pitchLen / 2 + 1.2]} size={[3, LINE_W]} color={LINE} />
      <Stumps x={cx} z={cz + pitchLen / 2} />
      <Stumps x={cx} z={cz - pitchLen / 2} />
      <Athlete variant="male-d" position={[cx, 0, cz - pitchLen / 2 - 3]} facing={0} animation="idle" phase={0.5} />
      <SignPost text="CRICKET" position={[cx - r + 1, 0, cz + r - 2]} color="#4d7c0f" />
      <Interactable
        id="sport-cricket"
        prompt="Press E to bat"
        position={[cx + 0.8, 0, creaseZ - 0.2]}
        triggerSize={[1.2, 1.2, 1.2]}
        onInteract={() => startSport('cricket')}
      />
      <CricketGame />
    </group>
  )
}

function Stumps({ x, z }: { x: number; z: number }) {
  return (
    <group>
      {[-0.11, 0, 0.11].map((dx) => (
        <mesh key={dx} position={[x + dx, 0.36, z]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.72, 6]} />
          <meshStandardMaterial color="#fef3c7" />
        </mesh>
      ))}
      <mesh position={[x, 0.73, z]}>
        <boxGeometry args={[0.26, 0.02, 0.03]} />
        <meshStandardMaterial color="#fef3c7" />
      </mesh>
      {/* Invisible box collider so the player can't walk through the wicket */}
      <CuboidCollider args={[0.13, 0.36, 0.03]} position={[x, 0.36, z]} />
    </group>
  )
}
