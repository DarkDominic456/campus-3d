import { Suspense, useRef } from 'react'
import type { Group, Vector3Tuple } from 'three'
import { Block } from './Block'
import { Sign } from './Sign'
import { BoxColliders } from './BoxColliders'
import { Model } from './Model'
import { boxItem, scaled, useBatch, useBatchedItems } from './Batch'
import { surfaceMaterial, type Surface } from './surfaces'

/** Potted plant (GLB) with a box collider. */
export function Plant({ position }: { position: Vector3Tuple }) {
  const [x, y, z] = position
  return (
    <>
      <BoxColliders boxes={[{ position: [x, y + 0.65, z], size: [0.45, 1.3, 0.5] }]} />
      <Suspense fallback={null}>
        <Model name="pottedPlant" position={position} />
      </Suspense>
    </>
  )
}

/** Sign on a post (outdoor zone markers). Text faces +Z at rotationY = 0. */
export function SignPost({
  text,
  position,
  rotationY = 0,
  color = '#1e293b',
}: {
  text: string
  position: Vector3Tuple
  rotationY?: number
  color?: string
}) {
  const [x, y, z] = position
  return (
    <group>
      <Block position={[x, y + 1.1, z]} size={[0.15, 2.2, 0.15]} color="#475569" />
      <Sign text={text} position={[x, y + 2.5, z]} rotationY={rotationY} width={2.6} height={0.6} fontSize={0.3} background={color} />
    </group>
  )
}

/** Visual-only flat patch on the ground (floors, paths, courts, line markings). Batched when possible. */
export function Floor({
  position,
  size,
  color,
  surface,
}: {
  /** Center; y is the surface height. */
  position: Vector3Tuple
  /** Width (X) and depth (Z). */
  size: [number, number]
  /** Flat color, or the tint of `surface`. */
  color?: string
  surface?: Surface
}) {
  const tint = color ?? (surface ? '#ffffff' : '#cbd5e1')
  const batch = useBatch()
  const anchor = useRef<Group>(null)
  // A 1 mm thick box instead of a plane so it can share the batched unit-box geometry.
  useBatchedItems(anchor, `${surface}|${tint}|${size.join()}`, (world) => [
    boxItem(scaled(world, size[0], 0.001, size[1]), tint, false, surface),
  ])

  if (batch) return <group ref={anchor} position={position} />
  return (
    <mesh position={position} rotation-x={-Math.PI / 2} receiveShadow material={surface ? surfaceMaterial(surface, tint) : undefined}>
      <planeGeometry args={size} />
      {!surface && <meshStandardMaterial color={tint} />}
    </mesh>
  )
}
