import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { create } from 'zustand'
import type { Group } from 'three'
import { BUILDING, SLAB_BOTTOM, STAIRS } from './layout'

/**
 * Visibility layers: whole zones that can't be seen from where the player is are hidden
 * (both their normal meshes and their batched instances). Physics is unaffected.
 */
export type Layer = 'always' | 'groundInterior' | 'firstInterior' | 'outdoor'

/** Interiors stay visible from outside within this distance of the building (windows). */
const INTERIOR_VIEW_DISTANCE = 22

type LayerVisibility = Record<Layer, boolean>

export const useLayerStore = create<{ visible: LayerVisibility; setVisible: (v: LayerVisibility) => void }>()((set) => ({
  visible: { always: true, groundInterior: true, firstInterior: true, outdoor: true },
  setVisible: (visible) => set({ visible }),
}))

/** Decide which layers the player could possibly see from (x, y, z). */
export function computeLayers(x: number, y: number, z: number): LayerVisibility {
  const inside = x > BUILDING.minX - 0.5 && x < BUILDING.maxX + 0.5 && z > BUILDING.minZ - 0.5 && z < BUILDING.maxZ + 0.5
  const upstairs = y > SLAB_BOTTOM
  // Around the stairwell both floors are visible.
  const nearStairs = x > STAIRS.minX - 3 && x < STAIRS.maxX + 1 && z > STAIRS.zEnd - 2 && z < STAIRS.zStart + 2
  const dx = Math.max(BUILDING.minX - x, 0, x - BUILDING.maxX)
  const dz = Math.max(BUILDING.minZ - z, 0, z - BUILDING.maxZ)
  const nearBuilding = Math.hypot(dx, dz) < INTERIOR_VIEW_DISTANCE
  return {
    always: true,
    groundInterior: inside ? !upstairs || nearStairs : nearBuilding,
    firstInterior: inside ? upstairs || nearStairs : nearBuilding,
    // The sports ground sits behind the building: invisible from the front plaza / gate and
    // from the front half of the building (unless standing beside the building).
    outdoor: Math.abs(x) > BUILDING.maxX + 2 || (inside ? z < -2 : z < BUILDING.maxZ),
  }
}

/** Updates the layer store when the result changes (called from ZoneTracker's poll). */
export function updateLayers(x: number, y: number, z: number) {
  const next = computeLayers(x, y, z)
  const current = useLayerStore.getState().visible
  if ((Object.keys(next) as Layer[]).some((k) => next[k] !== current[k])) useLayerStore.getState().setVisible(next)
}

const LayerContext = createContext<Layer>('always')
export const useLayer = () => useContext(LayerContext)

/** Group whose visibility follows a layer (no React re-render of the children on toggle). */
export function LayerGroup({ layer, children }: { layer: Layer; children: ReactNode }) {
  const group = useRef<Group>(null)
  useEffect(() => {
    const apply = (v: LayerVisibility) => {
      if (group.current) group.current.visible = v[layer]
    }
    apply(useLayerStore.getState().visible)
    return useLayerStore.subscribe((s) => apply(s.visible))
  }, [layer])
  return <group ref={group}>{children}</group>
}

/**
 * Wrap a zone: its meshes (and any batched Block / Model / Floor inside it) are hidden
 * whenever the layer is not visible.
 */
export function ZoneLayer({ layer, children }: { layer: Layer; children: ReactNode }) {
  return (
    <LayerContext.Provider value={layer}>
      <LayerGroup layer={layer}>{children}</LayerGroup>
    </LayerContext.Provider>
  )
}
