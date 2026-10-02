import { useEffect } from 'react'
import { useGameStore } from '../store/useGameStore'
import { useSportStore } from '../minigames/sports/sportStore'
import { SEAT_FOCUS_ID } from '../world/zones/Classroom'
import { PRESENTATION_FOCUS_ID } from '../world/zones/PresentationScreen'
import { useTourStore } from './tour'

/** Completes tour steps from what happens in the game (mount once in App3D). */
export function TourTracker() {
  useEffect(() => {
    const { complete } = useTourStore.getState()
    if (useGameStore.getState().user) complete('account')
    const offGame = useGameStore.subscribe((s, prev) => {
      if (s.user && !prev.user) complete('account')
      if (s.focus?.id !== prev.focus?.id) {
        if (s.focus?.id === SEAT_FOCUS_ID) complete('classroom')
        if (s.focus?.id === PRESENTATION_FOCUS_ID) complete('presentation')
      }
      if (s.activeOverlay?.id === 'profile' && prev.activeOverlay?.id !== 'profile') complete('profile')
    })
    const offSport = useSportStore.subscribe((s, prev) => {
      if (s.result && !prev.result) complete('sport')
    })
    return () => {
      offGame()
      offSport()
    }
  }, [])
  return null
}
