import { useEffect } from 'react'
import { playerRuntime } from '../player/playerRuntime'
import { useGameStore } from '../store/useGameStore'
import { FALLBACK_ZONE, findZone } from './zoneConfig'
import { SLAB_BOTTOM } from './layout'
import { updateLayers } from './layers'

const INTERVAL_MS = 200

/** Polls the player position and keeps `currentZone` / `currentFloor` in the store up to date. */
export function ZoneTracker() {
  useEffect(() => {
    const id = window.setInterval(() => {
      const { x, y, z } = playerRuntime.position
      const zone = findZone(x, y, z)
      const zoneId = zone?.id ?? FALLBACK_ZONE.id
      const floor: 0 | 1 = y > SLAB_BOTTOM ? 1 : 0
      updateLayers(x, y, z)
      const s = useGameStore.getState()
      if (s.currentZone !== zoneId || s.currentFloor !== floor) s.setLocation(zoneId, floor)
    }, INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [])

  return null
}
