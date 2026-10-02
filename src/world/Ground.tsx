import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { WORLD } from './layout'
import { surfaceMaterial } from './parts/surfaces'

const MARGIN = 5

export function Ground() {
  const w = WORLD.maxX - WORLD.minX + MARGIN * 2
  const d = WORLD.maxZ - WORLD.minZ + MARGIN * 2
  const cx = (WORLD.minX + WORLD.maxX) / 2
  const cz = (WORLD.minZ + WORLD.maxZ) / 2

  return (
    <RigidBody type="fixed" colliders={false} position={[cx, 0, cz]}>
      <CuboidCollider args={[w / 2, 0.5, d / 2]} position={[0, -0.5, 0]} />
      <mesh rotation-x={-Math.PI / 2} receiveShadow material={surfaceMaterial('grass')}>
        <planeGeometry args={[w, d]} />
      </mesh>
      {/* Wider backdrop beyond the boundary so the horizon isn't a hard edge */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.05, 0]} material={surfaceMaterial('grass', '#c8d8b8')}>
        <planeGeometry args={[w * 4, d * 4]} />
      </mesh>
    </RigidBody>
  )
}
