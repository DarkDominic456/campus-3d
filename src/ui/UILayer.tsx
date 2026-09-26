import { HUD } from './hud/HUD'
import { OverlayRoot } from './OverlayRoot'

/**
 * HTML layer on top of the canvas. The container ignores pointer events so the
 * canvas still receives drags; interactive children opt in with pointer-events-auto.
 */
export function UILayer() {
  return (
    <div className="pointer-events-none fixed inset-0 z-10 select-none">
      <HUD />
      <OverlayRoot />
    </div>
  )
}
