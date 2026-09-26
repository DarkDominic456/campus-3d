import { Html } from '@react-three/drei'
import type { Vector3Tuple } from 'three'
import { SlideDeck } from '../../ui/slides/SlideDeck'
import { useGameStore } from '../../store/useGameStore'

export const PRESENTATION_FOCUS_ID = 'conference-screen'

/** Screen size in meters and the HTML size in CSS px; distanceFactor maps px → m (px × f/400). */
const SCREEN = { width: 4.6, height: 2.5 }
const PX = { width: 920, height: 500 }
const DISTANCE_FACTOR = (SCREEN.width / PX.width) * 400

/**
 * The conference room screen: HTML slides rendered on the 3D surface via drei <Html transform>.
 * Only mounted while the player is in the room (HTML draws above the canvas, so it would
 * otherwise show through walls). Arrow keys / buttons navigate while focused.
 */
export function PresentationScreen({ position, rotationY }: { position: Vector3Tuple; rotationY: number }) {
  const inRoom = useGameStore((s) => s.currentZone === 'conference')
  const focused = useGameStore((s) => s.focus?.id === PRESENTATION_FOCUS_ID)

  return (
    <group position={position} rotation-y={rotationY}>
      {/* Physical screen, always visible */}
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[SCREEN.width + 0.12, SCREEN.height + 0.12, 0.04]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      {(inRoom || focused) && (
        <Html
          transform
          distanceFactor={DISTANCE_FACTOR}
          zIndexRange={[5, 0]}
          style={{ width: PX.width, height: PX.height, pointerEvents: focused ? 'auto' : 'none' }}
        >
          <SlideDeck keyboard={focused} />
        </Html>
      )}
    </group>
  )
}
