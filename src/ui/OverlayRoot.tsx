import type { ComponentType } from 'react'
import { useGameStore } from '../store/useGameStore'
import { overlayRegistry } from './overlays/registry'

export function OverlayRoot() {
  const active = useGameStore((s) => s.activeOverlay)
  if (!active) return null
  // openOverlay() is typed per id, so the props always match the component.
  const Overlay = overlayRegistry[active.id] as ComponentType<object>
  return <Overlay {...(active.props ?? {})} />
}
