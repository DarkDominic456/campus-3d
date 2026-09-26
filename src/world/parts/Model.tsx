import { useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { Euler, Group, Matrix4, Mesh, Quaternion, Vector3, type Vector3Tuple } from 'three'
import { propScale, propUrl, type PropName } from '../../assets/models'
import { InstancedGeometry, propItem, scaled, useBatch, useBatchedItems } from './Batch'

export interface ModelPlacement {
  position: Vector3Tuple
  /** Radians around Y. Models face +Z at 0. */
  rotationY?: number
  /** Multiplier on top of the pack's base scale. */
  scale?: number
}

interface ModelProps extends ModelPlacement {
  name: PropName
  castShadow?: boolean
}

/**
 * One placed GLB prop (visual only — add colliders separately).
 * Inside a <BatchProvider> it is drawn as part of a shared InstancedMesh.
 */
export function Model({ name, position, rotationY = 0, scale = 1, castShadow = true }: ModelProps) {
  const batch = useBatch()
  const anchor = useRef<Group>(null)
  useBatchedItems(anchor, `${name}|${castShadow}|${scale}`, (world) => {
    const s = propScale(name) * scale
    return [propItem(scaled(world, s, s, s), name, castShadow)]
  })

  if (batch) return <group ref={anchor} position={position} rotation-y={rotationY} />
  return <SingleModel name={name} position={position} rotationY={rotationY} scale={scale} castShadow={castShadow} />
}

function SingleModel({ name, position, rotationY, scale = 1, castShadow }: Required<Omit<ModelProps, 'scale'>> & { scale?: number }) {
  const { scene } = useGLTF(propUrl(name))
  const object = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse((o) => {
      if (o instanceof Mesh) {
        o.castShadow = castShadow
        o.receiveShadow = true
      }
    })
    return clone
  }, [scene, castShadow])
  return <primitive object={object} position={position} rotation-y={rotationY} scale={propScale(name) * scale} />
}

interface ModelInstancesProps {
  name: PropName
  items: ModelPlacement[]
  castShadow?: boolean
}

const tmp = { pos: new Vector3(), quat: new Quaternion(), euler: new Euler(), scale: new Vector3() }

/** Matrix for one placement (position, Y rotation, pack scale × item scale). */
export function placementMatrix(name: PropName, item: ModelPlacement) {
  const s = propScale(name) * (item.scale ?? 1)
  tmp.pos.set(...item.position)
  tmp.quat.setFromEuler(tmp.euler.set(0, item.rotationY ?? 0, 0))
  tmp.scale.set(s, s, s)
  return new Matrix4().compose(tmp.pos, tmp.quat, tmp.scale)
}

/**
 * Many copies of one GLB prop, drawn instanced (one InstancedMesh per sub-mesh).
 * Visual only — add colliders separately.
 */
export function ModelInstances({ name, items, castShadow = true }: ModelInstancesProps) {
  const batch = useBatch()
  const anchor = useRef<Group>(null)
  useBatchedItems(anchor, `${name}|${castShadow}|${JSON.stringify(items)}`, (world) =>
    items.map((item) => propItem(world.clone().multiply(placementMatrix(name, item)), name, castShadow)),
  )

  if (batch) return <group ref={anchor} />
  return <InstancedModel name={name} items={items} castShadow={castShadow} />
}

function InstancedModel({ name, items, castShadow }: Required<ModelInstancesProps>) {
  const { scene } = useGLTF(propUrl(name))
  const parts = useMemo(() => {
    scene.updateMatrixWorld(true)
    const list: Mesh[] = []
    scene.traverse((o) => {
      if (o instanceof Mesh) list.push(o)
    })
    return list
  }, [scene])
  const matrices = useMemo(() => items.map((item) => placementMatrix(name, item)), [items, name])

  return (
    <>
      {parts.map((part, i) => (
        <InstancedGeometry key={i} geometry={part.geometry} material={part.material} matrices={matrices} local={part.matrixWorld} castShadow={castShadow} />
      ))}
    </>
  )
}
