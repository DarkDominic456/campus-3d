import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { Block } from './Block'

const VISIBLE_H = 1.4
const COLLIDER_H = 5 // taller than a jump, so the player can't hop over

/** Axis-aligned hedge used for boundaries; `from`/`to` run along the given axis at `at`. */
export function Hedge({ axis, at, from, to }: { axis: 'x' | 'z'; at: number; from: number; to: number }) {
  const len = Math.abs(to - from)
  const mid = (from + to) / 2
  const size: [number, number, number] = axis === 'x' ? [len, VISIBLE_H, 1] : [1, VISIBLE_H, len]
  const pos: [number, number, number] = axis === 'x' ? [mid, 0, at] : [at, 0, mid]

  return (
    <RigidBody type="fixed" colliders={false} position={pos}>
      <CuboidCollider args={[size[0] / 2, COLLIDER_H / 2, size[2] / 2]} position={[0, COLLIDER_H / 2, 0]} />
      <Block position={[0, VISIBLE_H / 2, 0]} size={size} color="#2f6b3a" collide={false} />
    </RigidBody>
  )
}
