import { useSyncExternalStore } from 'react'

const QUERY = '(pointer: coarse)'
/** `?touch=1` forces the touch UI (handy for testing on desktop). */
const forced = typeof location !== 'undefined' && new URLSearchParams(location.search).get('touch') === '1'

function subscribe(onChange: () => void) {
  const mq = matchMedia(QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

export const isTouchDevice = () => forced || matchMedia(QUERY).matches

/** True on phones / tablets (coarse pointer): show the joystick and touch buttons. */
export function useIsTouch() {
  return useSyncExternalStore(subscribe, isTouchDevice, () => false)
}
