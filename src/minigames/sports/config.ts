import type { Vector3Tuple } from 'three'
import { COURTS } from '../../world/layout'
import type { CameraShot } from '../../store/useGameStore'
import type { SportId } from './sportStore'

export interface SportSpec {
  id: SportId
  title: string
  /** Round length in seconds. */
  duration: number
  scoreLabel: string
  controls: string
  /** Where the player stands (feet) and faces during the round. */
  spot: Vector3Tuple
  facing: number
  camera: CameraShot
}

const { basketball: bb, football: fb, cricket: ck } = COURTS

/** Basketball hoop: rim center and radius (matches the visual torus in OutdoorGround). */
export const HOOP = { x: bb.cx, y: 3.05, z: bb.hoopZ + 0.2, radius: 0.23 }
export const BASKETBALL_SPOT: Vector3Tuple = [bb.cx, 0, bb.hoopZ + 5]

/** Football goal mouth (goal line at z = goalZ). */
export const GOAL = { z: fb.goalZ, halfWidth: 3.65, height: 2.44 }
export const PENALTY_SPOT: Vector3Tuple = [fb.cx, 0, fb.goalZ + 11]

/** Cricket: pitch runs along Z; the batter faces −Z toward the bowler. */
export const PITCH_LENGTH = 20
export const CRICKET = {
  x: ck.cx,
  stumpsZ: ck.cz + PITCH_LENGTH / 2,
  creaseZ: ck.cz + PITCH_LENGTH / 2 - 1.2,
  bowlerZ: ck.cz - PITCH_LENGTH / 2 + 1.5,
}
/** Right-handed batter stands to the off side so the bat meets the ball's line. */
export const BATTER_SPOT: Vector3Tuple = [ck.cx - 0.45, 0, CRICKET.creaseZ + 0.4]

const FACE_NEG_Z = Math.PI

export const SPORTS: Record<SportId, SportSpec> = {
  basketball: {
    id: 'basketball',
    title: 'Basketball',
    duration: 45,
    scoreLabel: 'Points',
    controls: 'Space / click: lock aim, then shoot ·',
    spot: BASKETBALL_SPOT,
    facing: FACE_NEG_Z,
    camera: {
      position: [BASKETBALL_SPOT[0] + 0.9, 2.9, BASKETBALL_SPOT[2] + 3.4],
      target: [HOOP.x, 2.6, HOOP.z],
    },
  },
  football: {
    id: 'football',
    title: 'Penalty Shoot-out',
    duration: 45,
    scoreLabel: 'Goals',
    controls: 'Space / click: lock aim, then shoot ·',
    spot: PENALTY_SPOT,
    facing: FACE_NEG_Z,
    camera: {
      position: [PENALTY_SPOT[0], 2.4, PENALTY_SPOT[2] + 4.2],
      target: [PENALTY_SPOT[0], 1.1, GOAL.z],
    },
  },
  cricket: {
    id: 'cricket',
    title: 'Cricket Batting',
    duration: 60,
    scoreLabel: 'Runs',
    controls: 'Space / click to swing ·',
    spot: BATTER_SPOT,
    facing: FACE_NEG_Z,
    camera: {
      position: [CRICKET.x + 0.9, 2.3, CRICKET.stumpsZ + 3.2],
      target: [CRICKET.x, 0.9, CRICKET.bowlerZ],
    },
  },
}

export const sportFocusId = (id: SportId) => `sport-${id}`
