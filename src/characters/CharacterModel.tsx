import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { AnimationMixer, Mesh, Vector3, type AnimationAction } from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { ANIMATIONS_URL, CHARACTER_SCALE, characterUrl, type CharacterVariant } from '../assets/models'
import { buildClips, loopFor, type CharacterAnim } from './clips'

interface CharacterModelProps {
  variant: CharacterVariant
  animation: CharacterAnim
  timeScale?: number
  /** 0–1: start the loop part-way through so a crowd isn't in lock-step. */
  phase?: number
  /** Crossfade duration in seconds. */
  fade?: number
  /** Skip animation updates beyond this camera distance (meters). */
  cullDistance?: number
  /** Skinned shadows cost a second skinning pass; seated NPCs turn this off. */
  castShadow?: boolean
}

const worldPos = new Vector3()

/**
 * Animated Kenney mini character. Origin at the feet, faces +Z.
 * All variants share one skeleton, so clips come from a single animations.glb.
 */
export function CharacterModel({
  variant,
  animation,
  timeScale = 1,
  phase = 0,
  fade = 0.2,
  cullDistance = Infinity,
  castShadow = true,
}: CharacterModelProps) {
  const { scene } = useGLTF(characterUrl(variant))
  const { animations } = useGLTF(ANIMATIONS_URL)
  const clips = useMemo(() => buildClips(animations), [animations])

  const object = useMemo(() => {
    const clone = cloneSkinned(scene)
    clone.traverse((o) => {
      if (o instanceof Mesh) {
        o.castShadow = castShadow
        o.receiveShadow = true
      }
    })
    return clone
  }, [scene, castShadow])

  const mixer = useMemo(() => new AnimationMixer(object), [object])
  const current = useRef<AnimationAction | null>(null)

  useEffect(() => () => {
    mixer.stopAllAction()
    mixer.uncacheRoot(object)
  }, [mixer, object])

  useEffect(() => {
    const clip = clips[animation]
    const action = mixer.clipAction(clip)
    const loop = loopFor(animation)
    action.reset()
    action.setLoop(loop, Infinity)
    action.clampWhenFinished = true
    if (phase) action.time = phase * clip.duration
    action.fadeIn(current.current ? fade : 0).play()
    if (current.current && current.current !== action) current.current.fadeOut(fade)
    current.current = action
    // `phase` only matters for the first clip; deliberately not a dependency.
  }, [animation, clips, mixer, fade])

  useEffect(() => {
    current.current?.setEffectiveTimeScale(timeScale)
  }, [timeScale, animation])

  useFrame((state, delta) => {
    if (cullDistance !== Infinity) {
      object.getWorldPosition(worldPos)
      if (worldPos.distanceToSquared(state.camera.position) > cullDistance * cullDistance) return
    }
    mixer.update(Math.min(delta, 0.1))
  })

  return <primitive object={object} scale={CHARACTER_SCALE} />
}
