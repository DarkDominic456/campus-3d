import { AnimationClip, LoopOnce, LoopRepeat, type AnimationActionLoopStyles, type Object3D } from 'three'
import { buildPoseClips } from './poses'

/** Animation states any character (player or NPC) can be in. */
export type CharacterAnim =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'fall'
  | 'sit'
  /** Seated, hands working a laptop/keyboard. */
  | 'study'
  /** Seated, holding a game controller. */
  | 'game'
  /** Standing, gesturing with the right hand (receptionist, talking). */
  | 'talk'
  | 'wave'

/** States played straight from a Quaternius clip in animations.glb; the rest are poses.ts. */
const SOURCE = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Run',
  talk: 'Interact',
  wave: 'Wave',
} satisfies Partial<Record<CharacterAnim, string>>

/**
 * Ground speed (m/s) at which the Walk / Run clips' feet don't slide, at CHARACTER_SCALE —
 * measured from the foot stride. timeScale = moving speed / this.
 */
export const CLIP_SPEED = { walk: 1.21, run: 2.35 }

export const LOOP: Partial<Record<CharacterAnim, AnimationActionLoopStyles>> = { jump: LoopOnce }
export const loopFor = (anim: CharacterAnim) => LOOP[anim] ?? LoopRepeat

const cache = new WeakMap<AnimationClip[], Record<CharacterAnim, AnimationClip>>()

/**
 * Builds (once per loaded clip set) the clip for every CharacterAnim. `rig` is the skeleton
 * scene of animations.glb (rest pose), used to build the procedural poses.
 */
export function buildClips(source: AnimationClip[], rig: Object3D): Record<CharacterAnim, AnimationClip> {
  const cached = cache.get(source)
  if (cached) return cached

  const byName = (name: string) => {
    const clip = source.find((c) => c.name === name)
    if (!clip) throw new Error(`Animation "${name}" missing from animations.glb`)
    return clip
  }
  const clips = {
    ...(Object.fromEntries(Object.entries(SOURCE).map(([anim, name]) => [anim, byName(name)])) as Record<keyof typeof SOURCE, AnimationClip>),
    ...buildPoseClips(rig, byName('Idle')),
  }
  cache.set(source, clips)
  return clips
}
