import { useRef } from 'react'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import type { Group, Vector3Tuple } from 'three'
import { boxItem, scaled, useBatch, useBatchedItems } from './Batch'
import { surfaceMaterial, type Surface } from './surfaces'

export interface BlockProps {
  /** Center position. */
  position: Vector3Tuple
  /** Full size (width, height, depth). */
  size: Vector3Tuple
  rotation?: Vector3Tuple
  /** Flat color, or the tint of `surface` (default white when a surface is set). */
  color?: string
  /** Textured PBR surface (world-space UVs), see surfaces.ts. */
  surface?: Surface
  castShadow?: boolean
  /** false = visual only, no collider. */
  collide?: boolean
}

/**
 * Static box with a matching cuboid collider — the basic placeholder building block.
 * Inside a <BatchProvider> the visual is merged into one InstancedMesh per color.
 */
export function Block({ position, size, rotation, color, surface, castShadow = true, collide = true }: BlockProps) {
  const tint = color ?? (surface ? '#ffffff' : '#cbd5e1')
  const batch = useBatch()
  const anchor = useRef<Group>(null)
  useBatchedItems(anchor, `${surface}|${tint}|${castShadow}|${size.join()}`, (world) => [
    boxItem(scaled(world, ...size), tint, castShadow, surface),
  ])

  const visual = batch ? (
    <group ref={anchor} />
  ) : (
    <mesh castShadow={castShadow} receiveShadow material={surface ? surfaceMaterial(surface, tint) : undefined}>
      <boxGeometry args={size} />
      {!surface && <meshStandardMaterial color={tint} />}
    </mesh>
  )

  if (!collide) {
    return (
      <group position={position} rotation={rotation}>
        {visual}
      </group>
    )
  }
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} />
      {visual}
    </RigidBody>
  )
}
