import type { Vector3Tuple } from 'three'
import { CharacterModel } from '../characters/CharacterModel'
import type { CharacterAnim } from '../characters/clips'
import type { CharacterVariant } from '../assets/models'
import { SIT_SEAT_OFFSET } from '../characters/poses'

export const NPC_CULL_DISTANCE = 45
/**
 * Seated / standing NPCs barely move, so they drop to 1/3-rate animation beyond 16 m and hide
 * beyond 32 m (e.g. the classroom seen through the windows from the plaza).
 */
const STATIC_NPC_CULL_DISTANCE = 32

export interface StaticNpcProps {
  variant: CharacterVariant
  /** Feet position. For seated NPCs use seatPosition(). */
  position: Vector3Tuple
  /** Radians around Y, 0 = +Z. */
  facing: number
  animation: CharacterAnim
  phase?: number
}

/**
 * An NPC that stays in place (seated student, receptionist, gamer).
 * Visual only — the chair/desk colliders around it keep the player out.
 */
export function StaticNpc({ variant, position, facing, animation, phase = 0 }: StaticNpcProps) {
  return (
    <group position={position} rotation-y={facing}>
      {/* No shadow: seated/standing props-like NPCs; saves a skinned shadow pass each. */}
      <CharacterModel variant={variant} animation={animation} phase={phase} cullDistance={STATIC_NPC_CULL_DISTANCE} castShadow={false} />
    </group>
  )
}

/** Character origin for someone sitting on a seat whose top surface is at `seatHeight`. */
export const seatPosition = (x: number, seatHeight: number, z: number): Vector3Tuple => [x, seatHeight - SIT_SEAT_OFFSET, z]
