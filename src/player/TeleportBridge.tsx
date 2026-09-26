import { useEffect } from 'react'
import { useGameStore } from '../store/useGameStore'
import { teleportTo } from './playerRuntime'

/**
 * Performs `store.teleportRequest` (set by UI shared with the 2D site, which must not import
 * three.js / playerRuntime). Mounted only in the 3D app.
 */
export function TeleportBridge() {
  useEffect(
    () =>
      useGameStore.subscribe((s) => {
        if (!s.teleportRequest) return
        const { position, facing } = s.teleportRequest
        s.clearTeleportRequest()
        s.exitFocus()
        teleportTo(position, facing)
      }),
    [],
  )
  return null
}
