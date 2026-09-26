import { useEffect, useRef, type ReactNode } from 'react'
import { CuboidCollider, type IntersectionEnterPayload } from '@react-three/rapier'
import type { Vector3Tuple } from 'three'
import { InteractPrompt } from './InteractPrompt'
import { useGameStore } from '../store/useGameStore'

export interface InteractableProps {
  /** Unique across the whole world. */
  id: string
  /** Shown when the player is in range, e.g. "Press E to sit". */
  prompt: string
  onInteract: () => void
  position?: Vector3Tuple
  rotation?: Vector3Tuple
  /** Half-extents of the trigger box, relative to the group origin. */
  triggerSize?: Vector3Tuple
  triggerOffset?: Vector3Tuple
  /** Where the floating prompt appears, relative to the group origin. */
  promptOffset?: Vector3Tuple
  /** The visible object (mesh/GLB) plus its own colliders, if any. */
  children?: ReactNode
}

const isPlayer = (p: IntersectionEnterPayload) => p.other.rigidBodyObject?.userData?.isPlayer === true

/**
 * Wrap any object to make it interactable: a sensor trigger zone registers it
 * as "nearby" while the player is inside, InteractionManager runs onInteract on E.
 */
export function Interactable({
  id,
  prompt,
  onInteract,
  position,
  rotation,
  triggerSize = [1.5, 1.5, 1.5],
  triggerOffset = [0, 1, 0],
  promptOffset = [0, 2.2, 0],
  children,
}: InteractableProps) {
  const registerNearby = useGameStore((s) => s.registerNearby)
  const unregisterNearby = useGameStore((s) => s.unregisterNearby)

  // Keep latest callback/prompt without re-registering on every render.
  const latest = useRef({ onInteract, prompt })
  latest.current = { onInteract, prompt }

  useEffect(() => () => unregisterNearby(id), [id, unregisterNearby])

  return (
    <group position={position} rotation={rotation}>
      {children}
      <CuboidCollider
        sensor
        args={triggerSize}
        position={triggerOffset}
        onIntersectionEnter={(p) => {
          if (!isPlayer(p)) return
          registerNearby({ id, prompt: latest.current.prompt, interact: () => latest.current.onInteract() })
        }}
        onIntersectionExit={(p) => {
          if (isPlayer(p)) unregisterNearby(id)
        }}
      />
      <InteractPrompt id={id} prompt={prompt} position={promptOffset} />
    </group>
  )
}
