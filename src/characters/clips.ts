import { AnimationClip, LoopOnce, LoopRepeat, type AnimationActionLoopStyles } from 'three'

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

/** Which source clip (from animations.glb) each simple state plays. */
const SOURCE: Record<Exclude<CharacterAnim, 'study' | 'game'>, string> = {
  idle: 'idle',
  walk: 'walk',
  run: 'sprint',
  jump: 'jump',
  fall: 'fall',
  sit: 'sit',
  talk: 'interact-right',
  wave: 'emote-yes',
}

export const LOOP: Partial<Record<CharacterAnim, AnimationActionLoopStyles>> = { jump: LoopOnce }
export const loopFor = (anim: CharacterAnim) => LOOP[anim] ?? LoopRepeat

const isUpperBody = (trackName: string) => /^(arm-|torso|head)/.test(trackName)

/** Seated legs/hips from `sit` + upper body from another clip. */
function seatedWith(name: string, sit: AnimationClip, upper: AnimationClip) {
  const tracks = [
    ...sit.tracks.filter((t) => !isUpperBody(t.name)),
    ...upper.tracks.filter((t) => isUpperBody(t.name)),
  ].map((t) => t.clone())
  return new AnimationClip(name, -1, tracks)
}

const cache = new WeakMap<AnimationClip[], Record<CharacterAnim, AnimationClip>>()

/** Builds (once per loaded clip set) the clip for every CharacterAnim. */
export function buildClips(source: AnimationClip[]): Record<CharacterAnim, AnimationClip> {
  const cached = cache.get(source)
  if (cached) return cached

  const byName = (name: string) => {
    const clip = source.find((c) => c.name === name)
    if (!clip) throw new Error(`Animation "${name}" missing from animations.glb`)
    return clip
  }
  const clips = Object.fromEntries(
    Object.entries(SOURCE).map(([anim, name]) => [anim, byName(name)]),
  ) as Record<CharacterAnim, AnimationClip>
  clips.study = seatedWith('study', byName('sit'), byName('interact-right'))
  clips.game = seatedWith('game', byName('sit'), byName('holding-both'))

  cache.set(source, clips)
  return clips
}
