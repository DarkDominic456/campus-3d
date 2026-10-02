import { Suspense } from 'react'
import type { Vector3Tuple } from 'three'
import { ModelInstances, type ModelPlacement } from '../parts/Model'
import { BoxColliders } from '../parts/BoxColliders'
import { Hedge } from '../parts/Hedge'
import { Trees } from '../parts/Trees'
import { Floor } from '../parts/Props'
import { BUILDING, GATE_Z, PATHS, WORLD } from '../layout'

const PATH = '#e7e2dc' // tint of the paver texture

const TREES: Vector3Tuple[] = [
  // front plaza, either side of the path
  ...[14, 20, 26, 38, 42].map((z): Vector3Tuple => [-11, 0, z]),
  ...[14, 20, 26, 40].map((z): Vector3Tuple => [13, 0, z]),
  // around the building
  ...[-10, -2, 6].flatMap((z): Vector3Tuple[] => [[-24, 0, z], [24, 0, z]]),
  // outdoor edges
  ...[-40, -20, 0, 20, 40].map((x): Vector3Tuple => [x, 0, WORLD.minZ + 4]),
  ...[-75, -60, -30, -18].flatMap((z): Vector3Tuple[] => [[WORLD.minX + 4, 0, z], [WORLD.maxX + -4, 0, z]]),
  [-48, 0, 38], [48, 0, 38], [-40, 0, 12], [40, 0, 12],
]

/** Bush rows along the building front, either side of the entrance. */
const BUSH_XS = [-16.5, -14, -11.5, -9, -6.5, 6.5, 9, 11.5, 14, 16.5]
const BUSHES: ModelPlacement[] = BUSH_XS.map((x, i) => ({
  position: [x, 0, BUILDING.maxZ + 1] as Vector3Tuple,
  rotationY: i * 1.7,
}))
/** Flower beds lining the front path. */
const FLOWERS = (name: 'red' | 'yellow'): ModelPlacement[] =>
  Array.from({ length: 8 }, (_, i) => ({
    position: [(i % 2 ? 3.6 : -3.6) * (name === 'red' ? 1 : -1), 0, 13 + i * 2 + (name === 'red' ? 0 : 1)] as Vector3Tuple,
    rotationY: i,
  })).filter((f) => f.position[2] < GATE_Z - 2 || f.position[2] > GATE_Z + 2)

/** Shared outdoor dressing: world boundary, paths, trees, bushes, flowers. */
export function Campus() {
  return (
    <group>
      {/* World boundary */}
      <Hedge axis="x" at={WORLD.maxZ} from={WORLD.minX} to={WORLD.maxX} />
      <Hedge axis="x" at={WORLD.minZ} from={WORLD.minX} to={WORLD.maxX} />
      <Hedge axis="z" at={WORLD.minX} from={WORLD.minZ} to={WORLD.maxZ} />
      <Hedge axis="z" at={WORLD.maxX} from={WORLD.minZ} to={WORLD.maxZ} />

      {/* Paths: gate → building, building → sports, a cross path to each court (layout.PATHS) */}
      {PATHS.map((p, i) => (
        <Floor
          key={i}
          // Alternate heights a hair apart so crossing paths don't z-fight.
          position={[p.cx, 0.015 + (i % 2) * 0.001, p.cz]}
          size={[p.w, p.d]}
          color={i === 1 ? '#c9c1b8' : PATH}
          surface="pavers"
        />
      ))}

      <Trees positions={TREES} />

      <BoxColliders
        boxes={[-1, 1].map((side) => ({
          position: [side * 11.5, 0.5, BUILDING.maxZ + 1] as Vector3Tuple,
          size: [11, 1, 1.2] as Vector3Tuple,
        }))}
      />
      <Suspense fallback={null}>
        <ModelInstances name="bush" items={BUSHES} />
        <ModelInstances name="flower_redA" items={FLOWERS('red')} castShadow={false} />
        <ModelInstances name="flower_yellowA" items={FLOWERS('yellow')} castShadow={false} />
      </Suspense>
    </group>
  )
}
