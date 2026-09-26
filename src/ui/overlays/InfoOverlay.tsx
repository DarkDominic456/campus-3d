import { OverlayShell } from './OverlayShell'
import type { OverlayPropsMap } from '../../store/useGameStore'

export function InfoOverlay({ title, body }: OverlayPropsMap['info']) {
  return (
    <OverlayShell title={title}>
      <p className="leading-relaxed text-slate-700">{body}</p>
    </OverlayShell>
  )
}
