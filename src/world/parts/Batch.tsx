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

/**
 * Static-geometry batching. Every <Block> and <Model> inside a <BatchProvider> registers
 * its world matrix here instead of drawing itself; BatchRenderer draws one InstancedMesh
 * per (color, shadow) for boxes and per sub-mesh for GLB props. ~200 draw calls → ~40.
 * Only for things that never move.
 */

type BoxItem = { kind: 'box'; matrix: Matrix4; color: string; castShadow: boolean }
type PropItem = { kind: 'prop'; matrix: Matrix4; name: PropName; castShadow: boolean }
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
  const makeRef = useRef(make)
  makeRef.current = make
  useLayoutEffect(() => {
    if (!batch || !anchor.current) return
    anchor.current.updateWorldMatrix(true, false)
    const ids = makeRef.current(anchor.current.matrixWorld.clone()).map((item) => batch.add(item))
    return () => ids.forEach((id) => batch.remove(id))
  }, [batch, anchor, key])
}

// ---------------------------------------------------------------------------

const unitBox = new BoxGeometry(1, 1, 1)
const materials = new Map<string, MeshStandardMaterial>()
const materialFor = (color: string) => {
  let m = materials.get(color)
  if (!m) materials.set(color, (m = new MeshStandardMaterial({ color })))
  return m
}

function BatchRenderer({ store }: { store: BatchStore }) {
  const version = useSyncExternalStore(store.subscribe, store.getVersion)
  const groups = useMemo(() => {
    const boxes = new Map<string, BoxItem[]>()
    const props = new Map<string, PropItem[]>()
    for (const item of store.list()) {
      if (item.kind === 'box') {
        const key = `${item.color}|${item.castShadow}`
        boxes.set(key, [...(boxes.get(key) ?? []), item])
      } else {
        const key = `${item.name}|${item.castShadow}`
        props.set(key, [...(props.get(key) ?? []), item])
      }
    }
    return { boxes: [...boxes.entries()], props: [...props.entries()], version }
  }, [store, version])

  return (
    <>
      {groups.boxes.map(([key, items]) => (
        <InstancedGeometry
          key={key}
          geometry={unitBox}
          material={materialFor(items[0].color)}
          matrices={items.map((i) => i.matrix)}
          castShadow={items[0].castShadow}
        />
      ))}
      {groups.props.map(([key, items]) => (
        <Suspense key={key} fallback={null}>
          <PropBatch name={items[0].name} matrices={items.map((i) => i.matrix)} castShadow={items[0].castShadow} />
        </Suspense>
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

export const boxItem = (matrix: Matrix4, color: string, castShadow: boolean): BatchItem => ({ kind: 'box', matrix, color, castShadow })
export const propItem = (matrix: Matrix4, name: PropName, castShadow: boolean): BatchItem => ({ kind: 'prop', matrix, name, castShadow })
