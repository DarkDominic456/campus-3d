import { Suspense } from 'react'
import { Block } from '../parts/Block'
import { StaticNpc } from '../../npc/StaticNpc'
import { BoxColliders } from '../parts/BoxColliders'
import { Sign } from '../parts/Sign'
import { Hedge } from '../parts/Hedge'
import { Interactable } from '../../interactables/Interactable'
import { useGameStore } from '../../store/useGameStore'
import { GATE_Z, WORLD } from '../layout'

const PILLAR_X = 4.6
const BOOTH = { x: 8.6, z: GATE_Z + 3, size: 2.5 }

/** Entrance gate at the spawn point, with a security booth for login/signup. */
export function Gate() {
  return (
    <group>
      {/* Arch */}
      <Block position={[-PILLAR_X, 2.5, GATE_Z]} size={[1.2, 5, 1.2]} color="#78716c" />
      <Block position={[PILLAR_X, 2.5, GATE_Z]} size={[1.2, 5, 1.2]} color="#78716c" />
      <Block position={[0, 5.3, GATE_Z]} size={[PILLAR_X * 2 + 1.2, 0.8, 1.2]} color="#57534e" />
      <Sign text="WELCOME TO CAMPUS" position={[0, 5.3, GATE_Z + 0.63]} width={7} height={0.6} fontSize={0.42} background="#57534e" color="#fde68a" />
      <Sign text="CAMPUS" position={[0, 5.3, GATE_Z - 0.63]} rotationY={Math.PI} width={4} height={0.6} fontSize={0.42} background="#57534e" color="#fde68a" />

      {/* Fence line either side of the gate */}
      <Hedge axis="x" at={GATE_Z} from={PILLAR_X + 0.6} to={WORLD.maxX} />
      <Hedge axis="x" at={GATE_Z} from={WORLD.minX} to={-PILLAR_X - 0.6} />

      {/* Security booth */}
      <Block position={[BOOTH.x, 1.4, BOOTH.z]} size={[BOOTH.size, 2.8, BOOTH.size]} color="#e2e8f0" />
      <Block position={[BOOTH.x, 2.95, BOOTH.z]} size={[BOOTH.size + 0.5, 0.3, BOOTH.size + 0.5]} color="#1e3a8a" />
      <mesh position={[BOOTH.x - BOOTH.size / 2 - 0.01, 1.6, BOOTH.z]}>
        <boxGeometry args={[0.02, 0.9, 1.6]} />
        <meshStandardMaterial color="#bae6fd" emissive="#7dd3fc" emissiveIntensity={0.3} />
      </mesh>
      <Sign text="LOGIN / SIGN UP" position={[BOOTH.x - BOOTH.size / 2 - 0.03, 2.4, BOOTH.z]} rotationY={-Math.PI / 2} width={2.2} height={0.45} fontSize={0.22} background="#1e3a8a" />

      {/* Security guard beside the booth */}
      <BoxColliders boxes={[{ position: [BOOTH.x - 1.5, 0.9, BOOTH.z + 2], size: [0.7, 1.8, 0.7] }]} />
      <Suspense fallback={null}>
        <StaticNpc variant="male-f" position={[BOOTH.x - 1.5, 0, BOOTH.z + 2]} facing={-Math.PI / 2} animation="idle" />
      </Suspense>

      {/* Login / Signup (or account, when already signed in) */}
      <Interactable
        id="gate-booth"
        prompt="Press E to log in / sign up"
        position={[BOOTH.x - BOOTH.size / 2 - 0.8, 0, BOOTH.z]}
        triggerSize={[0.9, 1.2, 1.4]}
        promptOffset={[0, 2.3, 0]}
        onInteract={() => useGameStore.getState().openOverlay('auth')}
      />
    </group>
  )
}
