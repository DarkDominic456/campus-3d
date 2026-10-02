import { Suspense, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { playerRuntime, RUN_SPEED, WALK_SPEED } from './playerRuntime'
import { CharacterModel } from '../characters/CharacterModel'
import { CLIP_SPEED } from '../characters/clips'
import { useGameStore, type PlayerAnimation } from '../store/useGameStore'

/**
 * Animation speed per state so the feet roughly match WALK_SPEED / RUN_SPEED in Player.
 * Capped at 1.9× — faster looks frantic; a little foot sliding reads better.
 */
const TIME_SCALE: Partial<Record<PlayerAnimation, number>> = {
  walk: Math.min(1.9, WALK_SPEED / CLIP_SPEED.walk),
  run: Math.min(1.9, RUN_SPEED / CLIP_SPEED.run),
}

/**
 * Visual-only player model. Origin is at the feet, facing +Z.
 * Shows a capsule until the character GLB has loaded.
 */
export function PlayerModel() {
  const anim = useGameStore((s) => s.playerAnimation)
  const avatar = useGameStore((s) => s.playerAvatar)
  const hidden = useGameStore((s) => s.focus?.hidePlayer ?? false)

  const group = useRef<Group>(null)
  useFrame(() => {
    if (group.current) group.current.visible = !hidden && !playerRuntime.cameraTooClose
  })

  return (
    <group ref={group} visible={!hidden}>
      <Suspense fallback={<CapsulePlaceholder />}>
        <CharacterModel key={avatar} variant={avatar} animation={anim} timeScale={TIME_SCALE[anim] ?? 1} fade={0.15} />
      </Suspense>
    </group>
  )
}

function CapsulePlaceholder() {
  return (
    <mesh position={[0, 0.85, 0]} castShadow>
      <capsuleGeometry args={[0.35, 1, 8, 16]} />
      <meshStandardMaterial color="#3b82f6" />
    </mesh>
  )
}
