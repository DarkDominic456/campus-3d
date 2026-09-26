import { CuboidCollider, RigidBody } from '@react-three/rapier'
import type { Vector3Tuple } from 'three'

export interface ColliderBox {
  /** Center of the box. */
  position: Vector3Tuple
  /** Full size (width, height, depth). */
  size: Vector3Tuple
  /** Radians around Y. */
  rotationY?: number
}

/**
 * Invisible static box colliders on one fixed rigid body. Pair with GLB visuals:
 * models are never used as colliders (see "Colliders" rule in CLAUDE.md).
 */
export function BoxColliders({ boxes, userData }: { boxes: ColliderBox[]; userData?: Record<string, unknown> }) {
  return (
    <RigidBody type="fixed" colliders={false} userData={userData}>
      {boxes.map((b, i) => (
        <CuboidCollider
          key={i}
          args={[b.size[0] / 2, b.size[1] / 2, b.size[2] / 2]}
          position={b.position}
          rotation={[0, b.rotationY ?? 0, 0]}
        />
      ))}
    </RigidBody>
  )
}
