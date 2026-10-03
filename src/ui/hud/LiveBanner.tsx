import { useState } from 'react'
import { useGameStore } from '../../store/useGameStore'
import { liveSession, useNow } from '../../sessions/schedule'
import { PRESENTATION_FOCUS_ID } from '../../world/zones/PresentationScreen'
import { watchFromAnywhere } from '../../world/zones/ConferenceRoom'

const DISMISSED_KEY = 'campus3d.liveDismissed'

/** "● Live now: …  [Watch] ×" under the location badge while a session is on (3D HUD). */
export function LiveBanner() {
  const now = useNow(30_000)
  const live = liveSession(now)
  const watching = useGameStore((s) => s.focus?.id === PRESENTATION_FOCUS_ID)
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISSED_KEY)
    } catch {
      return null
    }
  })
  if (!live || watching) return null
  const key = `${live.session.id}@${live.start.getTime()}`
  if (dismissed === key) return null
  const dismiss = () => {
    setDismissed(key)
    try {
      sessionStorage.setItem(DISMISSED_KEY, key)
    } catch {
      // ignore
    }
  }
  return (
    <div role="status" className="pointer-events-auto flex w-72 items-center gap-2 rounded-xl bg-rose-600/95 px-3 py-2 text-xs text-white shadow-lg ring-1 ring-white/20 backdrop-blur">
      <span className="size-2 shrink-0 animate-pulse rounded-full bg-white" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="font-bold tracking-wide uppercase">Live now</span>
        <span className="block truncate text-sm">{live.session.title}</span>
      </span>
      <button type="button" onClick={watchFromAnywhere} className="rounded-lg bg-white px-2.5 py-1 font-semibold text-rose-700 hover:bg-rose-50">
        Watch
      </button>
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="rounded px-1 text-base leading-none text-rose-100 hover:text-white">
        ×
      </button>
    </div>
  )
}
