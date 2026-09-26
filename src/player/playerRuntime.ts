import { Vector3, type Vector3Tuple } from 'three'
import type { RapierRigidBody } from '@react-three/rapier'

/** Just outside the entrance gate, facing the campus (-Z). */
export const SPAWN_POSITION: Vector3Tuple = [0, 1, 38]
/** Model facing angle (radians around Y, 0 = +Z). Math.PI = facing -Z. */
export const SPAWN_FACING = Math.PI

/**
 * Per-frame player data shared outside React (camera, minimap, NPCs, minigames).
 * Mutated every frame by Player — never put this in zustand.
 */
export const playerRuntime = {
  /** Capsule center, world space. */
  position: new Vector3(...SPAWN_POSITION),
  /** Direction the character model faces (radians around Y, 0 = +Z). */
  facing: SPAWN_FACING,
  body: null as RapierRigidBody | null,
  /** Consumed by Player on its next frame. */
  pendingTeleport: null as { position: Vector3Tuple; facing: number } | null,
  /** Set by Player after a teleport; consumed by ThirdPersonCamera to snap behind the player. */
  cameraSnap: null as { facing: number } | null,
  /** True while the orbit camera is squeezed right behind the head (PlayerModel hides itself). */
  cameraTooClose: false,
}

/**
 * Move the player instantly. `facing` is the direction the character should look
 * (radians around Y, 0 = +Z); the camera snaps behind it.
 */
export function teleportTo(position: Vector3Tuple, facing: number) {
  playerRuntime.pendingTeleport = { position, facing }
}
