import { OverlayShell } from './OverlayShell'
import type { OverlayPropsMap } from '../../store/useGameStore'
import { SessionsContent } from '../sessions/SessionsContent'
import { watchFromAnywhere } from '../../world/zones/ConferenceRoom'

/** Conference room board / live banner → the session schedule. "Watch" walks you to the big screen. */
export function SessionsOverlay(_: OverlayPropsMap['sessions']) {
  return (
    <OverlayShell title="Sessions">
      <SessionsContent onWatch={watchFromAnywhere} />
    </OverlayShell>
  )
}
