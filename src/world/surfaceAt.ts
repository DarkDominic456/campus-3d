import { BUILDING, COURTS, PATHS, type GroundRect } from './layout'

/** What the ground sounds like underfoot (picks the footstep sound). */
export type GroundSound = 'grass' | 'hard' | 'wood' | 'carpet'

/** Floor material per indoor zone (zoneConfig ids); hall, corridor and stairs are tiles / concrete. */
const INDOOR: Record<string, GroundSound> = {
  classroom: 'wood',
  office: 'wood',
  gaming: 'carpet',
  conference: 'carpet',
}

const inside = (r: GroundRect, x: number, z: number, margin = 0) =>
  Math.abs(x - r.cx) <= r.w / 2 + margin && Math.abs(z - r.cz) <= r.d / 2 + margin

const BASKETBALL_COURT: GroundRect = { cx: COURTS.basketball.cx, cz: COURTS.basketball.cz, w: COURTS.basketball.w, d: COURTS.basketball.d }

/** Footstep surface at a position, given the current zone id (from ZoneTracker). */
export function surfaceAt(x: number, z: number, zone: string): GroundSound {
  const inBuilding = x > BUILDING.minX && x < BUILDING.maxX && z > BUILDING.minZ && z < BUILDING.maxZ
  if (inBuilding) return INDOOR[zone] ?? 'hard'
  // Building entrance pads, paths and the basketball court are paved.
  if (Math.abs(x) <= 3 && (Math.abs(z - (BUILDING.maxZ + 1.5)) <= 1.5 || Math.abs(z - (BUILDING.minZ - 1.5)) <= 1.5)) return 'hard'
  if (PATHS.some((r) => inside(r, x, z, 0.1)) || inside(BASKETBALL_COURT, x, z)) return 'hard'
  return 'grass'
}
