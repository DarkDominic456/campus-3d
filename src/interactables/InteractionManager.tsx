import { useEffect } from 'react'
import { selectActiveInteractable, useGameStore } from '../store/useGameStore'
import { isTypingTarget } from '../utils/dom'

/**
 * Global key handling for interactions:
 * E runs the active interactable; Esc closes the overlay, or leaves focus (stand up / leave screen).
 */
export function InteractionManager() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const state = useGameStore.getState()

      if (e.code === 'Escape') {
        if (state.activeOverlay) {
          e.preventDefault()
          state.closeOverlay()
        } else if (state.focus) {
          e.preventDefault()
          state.exitFocus()
        }
        return
      }

      if (e.code === 'KeyE' && !e.repeat && !state.activeOverlay && !state.focus && !isTypingTarget(e.target)) {
        selectActiveInteractable(state)?.interact()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return null
}
