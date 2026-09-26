import { Suspense, useMemo } from 'react'
import type { Vector3Tuple } from 'three'
import { ModelInstances, type ModelPlacement } from './Model'
import { BoxColliders } from './BoxColliders'
import type { NatureName } from '../../assets/models'

const TREE_TYPES: NatureName[] = ['tree_default', 'tree_oak', 'tree_detailed', 'tree_pineRoundA', 'tree_fat']

/** Deterministic 0–1 value per index, so trees look varied but never reshuffle. */
const rand = (i: number, salt: number) => {
  const h = Math.sin((i + 1) * 91.7 + salt * 17.3) * 43758.5453
  return h - Math.floor(h)
}

/** Kenney nature-kit trees (instanced per type), with a box collider per trunk. */
export function Trees({ positions }: { positions: Vector3Tuple[] }) {
  const groups = useMemo(() => {
    const byType = new Map<NatureName, ModelPlacement[]>()
    positions.forEach((position, i) => {
      const type = TREE_TYPES[Math.floor(rand(i, 1) * TREE_TYPES.length)]
      byType.set(type, [
        ...(byType.get(type) ?? []),
        { position, rotationY: rand(i, 2) * Math.PI * 2, scale: 0.85 + rand(i, 3) * 0.4 },
      ])
    })
    return [...byType.entries()]
  }, [positions])

  const trunks = useMemo(
    () => positions.map(([x, , z]) => ({ position: [x, 1.5, z] as Vector3Tuple, size: [0.6, 3, 0.6] as Vector3Tuple })),
    [positions],
  )

  return (
    <>
      <BoxColliders boxes={trunks} />
      <Suspense fallback={null}>
        {groups.map(([type, items]) => (
          <ModelInstances key={type} name={type} items={items} />
        ))}
      </Suspense>
    </>
  )
}
