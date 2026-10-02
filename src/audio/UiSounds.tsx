import { useEffect } from 'react'
import { selectActiveInteractable, useGameStore } from '../store/useGameStore'
import { playSound } from './audio'

/** Interface clicks: panels opening / closing, a soft tick when a "Press E" prompt appears. */
export function UiSounds() {
  useEffect(
    () =>
      useGameStore.subscribe((s, prev) => {
        if (s.activeOverlay && !prev.activeOverlay) playSound('ui-open', { volume: 0.5 })
        else if (!s.activeOverlay && prev.activeOverlay) playSound('ui-close', { volume: 0.5 })
        const now = selectActiveInteractable(s)?.id
        if (now && now !== selectActiveInteractable(prev)?.id && !s.activeOverlay && !s.focus) playSound('ui-prompt', { volume: 0.35 })
      }),
    [],
  )
  return null
}
