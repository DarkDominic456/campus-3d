import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useSceneReady } from './sceneReady'

/** Mount inside <Physics>: it only renders once Rapier is ready; reports after the first frame. */
export function ReadySignal() {
  const done = useRef(false)
  useFrame(() => {
    if (done.current) return
    done.current = true
    useSceneReady.getState().setReady()
  })
  return null
}
