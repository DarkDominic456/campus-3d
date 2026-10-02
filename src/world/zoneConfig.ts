import type { Vector3Tuple } from 'three'
import { BUILDING, COURTS, FLOOR1_Y, GATE_Z, HALL, SLAB_BOTTOM, WORLD } from './layout'

export interface ZoneDef {
  id: string
  label: string
  floor: 0 | 1
  /** Axis-aligned box: [minX, minY, minZ], [maxX, maxY, maxZ]. */
  min: Vector3Tuple
  max: Vector3Tuple
  /** Teleport target (capsule center) and facing (radians around Y, 0 = +Z). Omit = not in teleport menu. */
  spawn?: { position: Vector3Tuple; facing: number }
  /** Minimap fill color. */
  color: string
}

const FACE_NEG_Z = Math.PI
const FACE_POS_X = Math.PI / 2
const FACE_NEG_X = -Math.PI / 2

const G0 = -1 // ground floor y range
const G1 = SLAB_BOTTOM + 0.2
const F1 = FLOOR1_Y + 5
const CAPSULE_CENTER = 0.9 // spawn height above the floor

const { basketball: bb, football: fb, cricket: ck } = COURTS

/**
 * Zones drive the HUD location label, the teleport menu and the minimap.
 * Order matters: the first zone containing the player wins, so list specific zones first.
 */
export const ZONES: ZoneDef[] = [
  {
    id: 'classroom',
    label: 'Classrooms',
    floor: 0,
    min: [BUILDING.minX, G0, BUILDING.minZ],
    max: [HALL.minX, G1, BUILDING.maxZ],
    spawn: { position: [-5.5, CAPSULE_CENTER, 4], facing: FACE_NEG_X },
    color: '#f59e0b',
  },
  {
    id: 'gaming',
    label: 'Gaming Room',
    floor: 0,
    min: [HALL.maxX, G0, BUILDING.minZ],
    max: [BUILDING.maxX, G1, BUILDING.maxZ],
    spawn: { position: [5.5, CAPSULE_CENTER, 6], facing: FACE_POS_X },
    color: '#8b5cf6',
  },
  {
    id: 'hall',
    label: 'Main Hall',
    floor: 0,
    min: [HALL.minX, G0, BUILDING.minZ],
    max: [HALL.maxX, G1, BUILDING.maxZ],
    spawn: { position: [-1, CAPSULE_CENTER, 8], facing: FACE_NEG_Z },
    color: '#94a3b8',
  },
  {
    id: 'office',
    label: 'Office',
    floor: 1,
    min: [BUILDING.minX, G1, BUILDING.minZ],
    max: [HALL.minX, F1, BUILDING.maxZ],
    spawn: { position: [-5.5, FLOOR1_Y + CAPSULE_CENTER, -8], facing: FACE_NEG_X },
    color: '#0ea5e9',
  },
  {
    id: 'conference',
    label: 'Conference Room',
    floor: 1,
    min: [HALL.maxX, G1, BUILDING.minZ],
    max: [BUILDING.maxX, F1, BUILDING.maxZ],
    spawn: { position: [5.5, FLOOR1_Y + CAPSULE_CENTER, -9], facing: FACE_POS_X },
    color: '#ec4899',
  },
  {
    id: 'corridor',
    label: 'First Floor Corridor',
    floor: 1,
    min: [HALL.minX, G1, BUILDING.minZ],
    max: [HALL.maxX, F1, BUILDING.maxZ],
    color: '#94a3b8',
  },
  {
    id: 'basketball',
    label: 'Basketball Court',
    floor: 0,
    min: [bb.cx - bb.w / 2 - 2, G0, bb.cz - bb.d / 2 - 2],
    max: [bb.cx + bb.w / 2 + 2, F1, bb.cz + bb.d / 2 + 2],
    spawn: { position: [bb.cx, CAPSULE_CENTER, bb.cz + 5], facing: FACE_NEG_Z },
    color: '#ea580c',
  },
  {
    id: 'football',
    label: 'Football Pitch',
    floor: 0,
    min: [fb.cx - fb.w / 2 - 2, G0, fb.cz - fb.d / 2 - 3],
    max: [fb.cx + fb.w / 2 + 2, F1, fb.cz + fb.d / 2 + 2],
    spawn: { position: [fb.cx, CAPSULE_CENTER, fb.goalZ + 13], facing: FACE_NEG_Z },
    color: '#16a34a',
  },
  {
    id: 'cricket',
    label: 'Cricket Ground',
    floor: 0,
    min: [ck.cx - ck.r - 1, G0, ck.cz - ck.r - 1],
    max: [ck.cx + ck.r + 1, F1, ck.cz + ck.r + 1],
    spawn: { position: [ck.cx, CAPSULE_CENTER, ck.cz + 12], facing: FACE_NEG_Z },
    color: '#65a30d',
  },
  {
    id: 'outdoor',
    label: 'Outdoor Ground',
    floor: 0,
    min: [WORLD.minX, G0, WORLD.minZ],
    max: [WORLD.maxX, F1, BUILDING.minZ],
    spawn: { position: [0, CAPSULE_CENTER, BUILDING.minZ - 5], facing: FACE_NEG_Z },
    color: '#4d7c0f',
  },
  {
    id: 'plaza',
    label: 'Front Plaza',
    floor: 0,
    min: [WORLD.minX, G0, BUILDING.maxZ],
    max: [WORLD.maxX, F1, GATE_Z - 6],
    color: '#64748b',
  },
  {
    id: 'gate',
    label: 'Entrance Gate',
    floor: 0,
    min: [WORLD.minX, G0, GATE_Z - 6],
    max: [WORLD.maxX, F1, WORLD.maxZ],
    spawn: { position: [0, CAPSULE_CENTER, GATE_Z + 8], facing: FACE_NEG_Z },
    color: '#64748b',
  },
]

export const FALLBACK_ZONE = { id: 'campus', label: 'Campus Grounds' }

/** Zones with a roof overhead: ambience is muffled and the lights come on at night. */
export const INDOOR_ZONE_IDS = new Set(['classroom', 'gaming', 'hall', 'office', 'conference', 'corridor'])

export function findZone(x: number, y: number, z: number): ZoneDef | null {
  for (const zone of ZONES) {
    const [ax, ay, az] = zone.min
    const [bx, by, bz] = zone.max
    if (x >= ax && x <= bx && y >= ay && y <= by && z >= az && z <= bz) return zone
  }
  return null
}

export const zoneLabel = (id: string) => ZONES.find((z) => z.id === id)?.label ?? FALLBACK_ZONE.label
