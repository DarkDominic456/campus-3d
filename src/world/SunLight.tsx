import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { DirectionalLight } from 'three'
import { playerRuntime } from '../player/playerRuntime'
import { useGameStore } from '../store/useGameStore'

const OFFSET = { x: 15, y: 25, z: 10 }
const SHADOW_EXTENT = 25

/**
 * The single shadow-casting light. Its shadow camera follows the player so a small
 * (1024²) shadow map covers wherever the player is, instead of the whole campus.
 */
export function SunLight() {
  const light = useRef<DirectionalLight>(null)
  const scene = useThree((s) => s.scene)
  // Low quality drops the shadow pass entirely (the single biggest GPU cost after the scene itself).
  const shadows = useGameStore((s) => s.graphicsQuality === 'high')

  useEffect(() => {
    const l = light.current
    if (!l) return
    scene.add(l.target)
    return () => {
      scene.remove(l.target)
    }
  }, [scene])

  useFrame(() => {
    const l = light.current
    if (!l) return
    const p = playerRuntime.position
    // Snap to whole meters to reduce shadow shimmering while moving.
    const x = Math.round(p.x)
    const z = Math.round(p.z)
    l.position.set(x + OFFSET.x, OFFSET.y, z + OFFSET.z)
    l.target.position.set(x, 0, z)
  })

  return (
    <directionalLight
      ref={light}
      intensity={1.8}
      castShadow={shadows}
      shadow-mapSize={[1024, 1024]}
      shadow-camera-left={-SHADOW_EXTENT}
      shadow-camera-right={SHADOW_EXTENT}
      shadow-camera-top={SHADOW_EXTENT}
      shadow-camera-bottom={-SHADOW_EXTENT}
      shadow-camera-near={1}
      shadow-camera-far={80}
      shadow-bias={-0.0005}
      shadow-normalBias={0.02}
    />
  )
}
