import { Suspense } from 'react'
import { CharacterModel } from '../characters/CharacterModel'
import { useGameStore, type PlayerAnimation } from '../store/useGameStore'

/** Animation speed per state, tuned so feet roughly match WALK_SPEED / RUN_SPEED in Player. */
const TIME_SCALE: Partial<Record<PlayerAnimation, number>> = { walk: 1.5, run: 1.1 }

/**
 * Visual-only player model. Origin is at the feet, facing +Z.
 * Shows a capsule until the character GLB has loaded.
 */
export function PlayerModel() {
  const anim = useGameStore((s) => s.playerAnimation)
  const avatar = useGameStore((s) => s.playerAvatar)
  const hidden = useGameStore((s) => s.focus?.hidePlayer ?? false)

  return (
    <group visible={!hidden}>
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
