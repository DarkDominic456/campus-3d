import {
  createContext,
  Suspense,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from 'react'
import { useGLTF } from '@react-three/drei'
import { BoxGeometry, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Object3D } from 'three'
import { propUrl, type PropName } from '../../assets/models'
import { LayerGroup, useLayer, type Layer } from '../layers'
import { surfaceMaterial, type Surface } from './surfaces'

/**
 * Static-geometry batching. Every <Block> and <Model> inside a <BatchProvider> registers
 * its world matrix here instead of drawing itself; BatchRenderer draws one InstancedMesh
 * per (layer, surface, color, shadow) for boxes and per (layer, sub-mesh, 32 m cell) for GLB props.
 * ~200 draw calls → ~40. Only for things that never move. Items remember the visibility
 * layer (world/layers.tsx) of the zone they were declared in, so hidden zones hide their
 * instances too.
 */

type BoxItem = { kind: 'box'; matrix: Matrix4; color: string; surface?: Surface; castShadow: boolean; layer?: Layer }
type PropItem = { kind: 'prop'; matrix: Matrix4; name: PropName; castShadow: boolean; layer?: Layer }
type BatchItem = BoxItem | PropItem

class BatchStore {
  private items = new Map<number, BatchItem>()
  private nextId = 0
  private version = 0
  private listeners = new Set<() => void>()
  private scheduled = false

  add(item: BatchItem) {
    const id = this.nextId++
    this.items.set(id, item)
    this.bump()
    return id
  }
  remove(id: number) {
    this.items.delete(id)
    this.bump()
  }
  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  getVersion = () => this.version
  list() {
    return [...this.items.values()]
  }
  /** Coalesce many registrations (one per Block on mount) into one re-render. */
  private bump() {
    if (this.scheduled) return
    this.scheduled = true
    queueMicrotask(() => {
      this.scheduled = false
      this.version++
      this.listeners.forEach((fn) => fn())
    })
  }
}

const BatchContext = createContext<BatchStore | null>(null)

export function BatchProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => new BatchStore(), [])
  return (
    <BatchContext.Provider value={store}>
      {children}
      <BatchRenderer store={store} />
    </BatchContext.Provider>
  )
}

export const useBatch = () => useContext(BatchContext)

/**
 * While mounted, registers items built from the world matrix of `anchor` — an empty
 * group placed where the object would have been drawn. `make` must be stable per `key`.
 */
export function useBatchedItems(
  anchor: RefObject<Object3D | null>,
  key: string,
  make: (world: Matrix4) => BatchItem[],
) {
  const batch = useBatch()
  const layer = useLayer()
  const makeRef = useRef(make)
  makeRef.current = make
  useLayoutEffect(() => {
    if (!batch || !anchor.current) return
    anchor.current.updateWorldMatrix(true, false)
    const ids = makeRef.current(anchor.current.matrixWorld.clone()).map((item) => batch.add({ ...item, layer }))
    return () => ids.forEach((id) => batch.remove(id))
  }, [batch, anchor, key, layer])
}

// ---------------------------------------------------------------------------

/** Side of the spatial chunks props are split into (m). */
const CELL = 32

const unitBox = new BoxGeometry(1, 1, 1)
const materials = new Map<string, MeshStandardMaterial>()
const materialFor = (color: string) => {
  let m = materials.get(color)
  if (!m) materials.set(color, (m = new MeshStandardMaterial({ color })))
  return m
}

function BatchRenderer({ store }: { store: BatchStore }) {
  const version = useSyncExternalStore(store.subscribe, store.getVersion)
  const layers = useMemo(() => {
    const byLayer = new Map<Layer, { boxes: Map<string, BoxItem[]>; props: Map<string, PropItem[]> }>()
    for (const item of store.list()) {
      const layer = item.layer ?? 'always'
      let g = byLayer.get(layer)
      if (!g) byLayer.set(layer, (g = { boxes: new Map(), props: new Map() }))
      if (item.kind === 'box') {
        const key = `${item.surface ?? ''}|${item.color}|${item.castShadow}`
        g.boxes.set(key, [...(g.boxes.get(key) ?? []), item])
      } else {
        // Props are split into CELL-sized spatial chunks: an InstancedMesh is frustum-culled as
        // a whole, so one mesh spanning the campus (e.g. all trees) would never be culled.
        const cell = `${Math.floor(item.matrix.elements[12] / CELL)},${Math.floor(item.matrix.elements[14] / CELL)}`
        const key = `${item.name}|${item.castShadow}|${cell}`
        g.props.set(key, [...(g.props.get(key) ?? []), item])
      }
    }
    return { entries: [...byLayer.entries()], version }
  }, [store, version])

  return (
    <>
      {layers.entries.map(([layer, g]) => (
        <LayerGroup key={layer} layer={layer}>
          {[...g.boxes.entries()].map(([key, items]) => (
            <InstancedGeometry
              key={key}
              geometry={unitBox}
              material={items[0].surface ? surfaceMaterial(items[0].surface, items[0].color) : materialFor(items[0].color)}
              matrices={items.map((i) => i.matrix)}
              castShadow={items[0].castShadow}
            />
          ))}
          {[...g.props.entries()].map(([key, items]) => (
            <Suspense key={key} fallback={null}>
              <PropBatch name={items[0].name} matrices={items.map((i) => i.matrix)} castShadow={items[0].castShadow} />
            </Suspense>
          ))}
        </LayerGroup>
      ))}
    </>
  )
}

function PropBatch({ name, matrices, castShadow }: { name: PropName; matrices: Matrix4[]; castShadow: boolean }) {
  const { scene } = useGLTF(propUrl(name))
  const parts = useMemo(() => {
    scene.updateMatrixWorld(true)
    const list: Mesh[] = []
    scene.traverse((o) => {
      if (o instanceof Mesh) list.push(o)
    })
    return list
  }, [scene])

  return (
    <>
      {parts.map((part, i) => (
        <InstancedGeometry
          key={i}
          geometry={part.geometry}
          material={part.material}
          matrices={matrices}
          local={part.matrixWorld}
          castShadow={castShadow}
        />
      ))}
    </>
  )
}

const tmpMatrix = new Matrix4()

/** One InstancedMesh: instance i = matrices[i] × local. */
export function InstancedGeometry({
  geometry,
  material,
  matrices,
  local,
  castShadow = true,
}: {
  geometry: Mesh['geometry']
  material: Mesh['material']
  matrices: Matrix4[]
  local?: Matrix4
  castShadow?: boolean
}) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    matrices.forEach((m, i) => mesh.setMatrixAt(i, local ? tmpMatrix.multiplyMatrices(m, local) : m))
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [matrices, local])

  return <instancedMesh ref={ref} args={[geometry, material, matrices.length]} castShadow={castShadow} receiveShadow />
}

const tmpScale = new Matrix4()

/** world × scale(sx, sy, sz) as a new matrix. */
export const scaled = (world: Matrix4, sx: number, sy: number, sz: number) =>
  world.clone().multiply(tmpScale.makeScale(sx, sy, sz))

export const boxItem = (matrix: Matrix4, color: string, castShadow: boolean, surface?: Surface): BatchItem => ({
  kind: 'box',
  matrix,
  color,
  surface,
  castShadow,
})
export const propItem = (matrix: Matrix4, name: PropName, castShadow: boolean): BatchItem => ({ kind: 'prop', matrix, name, castShadow })
