/**
 * Single source of truth for world dimensions (meters). -Z is "into the campus":
 * gate (z≈30) → building (z 10…-14) → outdoor ground (z < -14).
 */

export const WORLD = { minX: -55, maxX: 55, minZ: -85, maxZ: 45 }

export const WALL_T = 0.3
export const DOOR_H = 3.2

export const BUILDING = { minX: -18, maxX: 18, minZ: -14, maxZ: 10 }
/** Central hall between classroom/office (west) and gaming/conference (east). */
export const HALL = { minX: -4, maxX: 4 }

/** Ground floor ceiling = slab bottom; first floor walking surface = slab top. */
export const SLAB_BOTTOM = 4
export const FLOOR1_Y = 4.3
export const ROOF_Y = 8.3

/** Straight stair flight in the hall, against the gaming-room wall, climbing toward -Z. */
export const STAIRS = (() => {
  const steps = 17
  const rise = FLOOR1_Y / steps
  const run = 0.42
  const zStart = 2
  return {
    minX: 1.5,
    maxX: HALL.maxX - WALL_T / 2,
    zStart,
    zEnd: zStart - steps * run,
    steps,
    rise,
    run,
  }
})()

export const GATE_Z = 30

/** Where "take me to…" buttons drop the player (capsule center + facing, radians around Y). */
export const SPOTS = {
  /** In front of the login booth at the gate. */
  gateBooth: { position: [6.55, 0.9, GATE_Z + 3] as [number, number, number], facing: Math.PI / 2 },
  /** In front of the office profile desk (first floor). */
  profileDesk: { position: [-7.4, FLOOR1_Y + 0.9, -3] as [number, number, number], facing: -Math.PI / 2 },
}

/** Outdoor sports areas behind the building. */
export const COURTS = {
  basketball: { cx: -30, cz: -40, w: 15, d: 14, hoopZ: -46 },
  football: { cx: 0, cz: -52, w: 24, d: 36, goalZ: -70 },
  cricket: { cx: 32, cz: -50, r: 14 },
}

/** An axis-aligned ground rectangle (center + size). */
export interface GroundRect {
  cx: number
  cz: number
  w: number
  d: number
}

/** Paved campus paths (drawn in zones/Campus.tsx; footsteps sound "hard" on them). */
export const PATHS: GroundRect[] = (() => {
  const { basketball, cricket, football } = COURTS
  const crossZ = -28
  const strip = (cx: number, cz0: number, cz1: number, w: number): GroundRect => ({ cx, cz: (cz0 + cz1) / 2, w, d: Math.abs(cz1 - cz0) })
  return [
    strip(0, BUILDING.maxZ, WORLD.maxZ, 6), // front path: building → gate → boundary
    { cx: 0, cz: GATE_Z, w: 9.2, d: 3 }, // gate apron
    strip(0, BUILDING.minZ, football.cz + football.d / 2, 4), // back path → football
    { cx: (basketball.cx + cricket.cx) / 2, cz: crossZ, w: cricket.cx - basketball.cx, d: 3 }, // cross path
    strip(basketball.cx, crossZ, basketball.cz + basketball.d / 2, 3),
    strip(cricket.cx, crossZ, cricket.cz + cricket.r, 3),
  ]
})()
