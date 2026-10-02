import {
  AnimationClip,
  AnimationMixer,
  Object3D,
  Quaternion,
  QuaternionKeyframeTrack,
  Vector3,
  VectorKeyframeTrack,
} from 'three'
import { CHARACTER_SCALE } from '../assets/models'

/**
 * Procedural poses for the Quaternius rig, which has no sitting / jumping clips.
 *
 * A pose says where bones should *point* (bone → child direction) in character space:
 * +Z forward, +Y up, x > 0 = outward (mirrored for the left and right side automatically,
 * from where the bone sits in the rest pose). Starting from the first frame of `Idle`, each
 * listed bone is rotated (shortest arc) to its direction, parents first, and every bone's
 * rotation is recorded into a clip. Works on any rig orientation — no axis guessing.
 *
 * The rig is an exported IK rig: legs hang off `Body` (not `Hips`), and `Foot.L/R` (plus the
 * knee pole targets `PT.L/R`) are children of `Root`. So the pelvis height moves `Body`, and
 * after the legs are posed each foot is moved to the end of its shin (keeping it flat).
 */
type Dir = [x: number, y: number, z: number]

interface Pose {
  /** Bone (without .L/.R side suffix for paired bones) → direction. */
  bones: Record<string, Dir>
  /** Hip-joint (top of the thighs) position in meters relative to the character origin. */
  hips?: { y: number; z: number }
}

/** Bone → the child that defines its direction. Paired bones are listed without side. */
const CHILD: Record<string, string> = {
  UpperLeg: 'LowerLeg',
  LowerLeg: 'Foot', // the foot isn't the shin's child, but sits at its end in the rest pose
  UpperArm: 'LowerArm',
  LowerArm: 'Wrist',
  Neck: 'Head',
  Chest: 'Neck',
}
const PAIRED = new Set(['UpperLeg', 'LowerLeg', 'UpperArm', 'LowerArm'])
/** Parents first, so a child's rest direction already includes its parent's new rotation. */
const ORDER = ['Chest', 'Neck', 'UpperArm', 'LowerArm', 'UpperLeg', 'LowerLeg']

/** Hip-joint height when seated (m). The seat surface is SIT_SEAT_OFFSET below it. */
const SIT_HIPS = { y: 0.12, z: -0.06 }
/** Seat surface height above the character origin in the seated poses (hips minus thigh). */
export const SIT_SEAT_OFFSET = 0.04

const SEATED_LEGS: Record<string, Dir> = {
  UpperLeg: [0.1, -0.04, 1],
  LowerLeg: [0.02, -1, 0.1],
}

const POSES: Record<'sit' | 'jump' | 'fall', Pose> & Record<'study' | 'game', Pose[]> = {
  sit: {
    hips: SIT_HIPS,
    bones: { ...SEATED_LEGS, UpperArm: [0.18, -1, 0.3], LowerArm: [-0.15, -0.45, 1] },
  },
  // Typing on a laptop: forearms forward, two keyframes so the hands move a little.
  study: [
    { hips: SIT_HIPS, bones: { ...SEATED_LEGS, Neck: [0, 1, 0.35], UpperArm: [0.22, -0.8, 0.5], LowerArm: [-0.3, 0.02, 1] } },
    { hips: SIT_HIPS, bones: { ...SEATED_LEGS, Neck: [0, 1, 0.35], UpperArm: [0.2, -0.82, 0.48], LowerArm: [-0.24, -0.06, 1] } },
  ],
  // Holding a game controller: hands together in front of the chest.
  game: [
    { hips: SIT_HIPS, bones: { ...SEATED_LEGS, Neck: [0, 1, 0.15], UpperArm: [0.25, -0.85, 0.4], LowerArm: [-0.5, 0.25, 1] } },
    { hips: SIT_HIPS, bones: { ...SEATED_LEGS, Neck: [0, 1, 0.15], UpperArm: [0.25, -0.84, 0.42], LowerArm: [-0.48, 0.32, 1] } },
  ],
  jump: {
    bones: { UpperLeg: [0.08, -0.7, 0.7], LowerLeg: [0.04, -0.75, -0.65], UpperArm: [0.7, 0.45, 0.15], LowerArm: [0.55, 0.8, 0.1] },
  },
  fall: {
    bones: { UpperLeg: [0.12, -0.95, 0.3], LowerLeg: [0.06, -0.95, -0.3], UpperArm: [0.9, 0.2, 0.05], LowerArm: [0.9, 0.35, 0] },
  },
}

const tmp = {
  a: new Vector3(),
  b: new Vector3(),
  dir: new Vector3(),
  target: new Vector3(),
  q: new Quaternion(),
  world: new Quaternion(),
  parent: new Quaternion(),
}

/** Idle frame 0 on a copy of the rig: the base every pose starts from. */
function idleRig(rig: Object3D, idle: AnimationClip) {
  const copy = rig.clone(true)
  const mixer = new AnimationMixer(copy)
  mixer.clipAction(idle).play()
  mixer.update(0)
  copy.updateMatrixWorld(true)
  return copy
}

function applyPose(rig: Object3D, pose: Pose) {
  // Each foot's offset from its knee, in the knee's own frame (so it can follow the shin).
  const shins = ['L', 'R'].map((side) => {
    const knee = rig.getObjectByName(`LowerLeg${side}`)!
    const foot = rig.getObjectByName(`Foot${side}`)!
    const offset = foot.getWorldPosition(new Vector3()).sub(knee.getWorldPosition(tmp.a))
    return { knee, foot, local: offset.applyQuaternion(knee.getWorldQuaternion(tmp.q).invert()) }
  })

  if (pose.hips) {
    // Move Body (parent of hips and thighs) so the hip joints land at the target.
    const body = rig.getObjectByName('Body')!
    const hip = rig.getObjectByName('UpperLegL')!.getWorldPosition(tmp.a).add(rig.getObjectByName('UpperLegR')!.getWorldPosition(tmp.b)).multiplyScalar(0.5)
    const delta = tmp.target.set(hip.x, pose.hips.y / CHARACTER_SCALE, pose.hips.z / CHARACTER_SCALE).sub(hip)
    body.position.copy(body.parent!.worldToLocal(body.getWorldPosition(new Vector3()).add(delta)))
    rig.updateMatrixWorld(true)
  }

  for (const base of ORDER) {
    const dir = pose.bones[base]
    if (!dir) continue
    for (const side of PAIRED.has(base) ? ['L', 'R'] : ['']) {
      const bone = rig.getObjectByName(base + side)
      const child = rig.getObjectByName(CHILD[base] + side)
      if (!bone || !child) continue
      bone.getWorldPosition(tmp.a)
      // The leg's end is the foot (moved below), so measure the shin from the stored offset.
      if (base === 'LowerLeg') tmp.b.copy(shins[side === 'L' ? 0 : 1].local).applyQuaternion(bone.getWorldQuaternion(tmp.q)).add(tmp.a)
      else child.getWorldPosition(tmp.b)
      // Outward = the side of the body this bone is on.
      const outward = side ? Math.sign(tmp.a.x) || 1 : 1
      tmp.dir.subVectors(tmp.b, tmp.a).normalize()
      tmp.target.set(dir[0] * outward, dir[1], dir[2]).normalize()
      tmp.q.setFromUnitVectors(tmp.dir, tmp.target)
      bone.getWorldQuaternion(tmp.world).premultiply(tmp.q)
      bone.parent!.getWorldQuaternion(tmp.parent).invert()
      bone.quaternion.copy(tmp.parent.multiply(tmp.world))
      rig.updateMatrixWorld(true)
    }
  }

  // Feet are children of Root (IK rig): put each at the end of its posed shin, rotation unchanged.
  for (const { knee, foot, local } of shins) {
    const ankle = local.clone().applyQuaternion(knee.getWorldQuaternion(tmp.q)).add(knee.getWorldPosition(tmp.a))
    foot.position.copy(foot.parent!.worldToLocal(ankle))
  }
  rig.updateMatrixWorld(true)
}

/**
 * Builds a looping clip through the given poses (one key each, `period` seconds apart,
 * back to the first). Every node animated by `idle` gets a track, so nothing keeps a stale
 * rotation from the previous clip.
 */
export function poseClip(name: string, rig: Object3D, idle: AnimationClip, poses: Pose[], period = 0.6) {
  const nodes = [...new Set(idle.tracks.map((t) => t.name.split('.')[0]))]
  const frames = poses.map((pose) => {
    const copy = idleRig(rig, idle)
    applyPose(copy, pose)
    return copy
  })
  const keys = [...frames, frames[0]]
  const times = keys.map((_, i) => i * period)
  const tracks = []
  for (const name of nodes) {
    const values = keys.flatMap((f) => f.getObjectByName(name)!.quaternion.toArray())
    tracks.push(new QuaternionKeyframeTrack(`${name}.quaternion`, times, values))
  }
  // Positions: whatever Idle moves, plus the bones the poses move (Body, feet).
  const moved = new Set([...idle.tracks.filter((t) => t.name.endsWith('.position')).map((t) => t.name.split('.')[0]), 'Body', 'FootL', 'FootR'])
  for (const name of moved) {
    const values = keys.flatMap((f) => f.getObjectByName(name)!.position.toArray())
    tracks.push(new VectorKeyframeTrack(`${name}.position`, times, values))
  }
  return new AnimationClip(name, times[times.length - 1], tracks)
}

/** All procedural clips for the rig (sit, study, game, jump, fall). */
export function buildPoseClips(rig: Object3D, idle: AnimationClip) {
  return {
    sit: poseClip('sit', rig, idle, [POSES.sit]),
    study: poseClip('study', rig, idle, POSES.study, 0.35),
    game: poseClip('game', rig, idle, POSES.game, 0.5),
    jump: poseClip('jump', rig, idle, [POSES.jump]),
    fall: poseClip('fall', rig, idle, [POSES.fall]),
  }
}
