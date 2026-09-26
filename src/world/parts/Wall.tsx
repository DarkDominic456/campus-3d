import { Block } from './Block'
import { BoxColliders } from './BoxColliders'
import { WALL_T } from '../layout'

export interface Opening {
  /** Center of the opening along the wall. */
  center: number
  width: number
  height: number
  /** Bottom of the opening above the wall base (0 = door, >0 = window). */
  sill?: number
}

interface WallProps {
  /** 'x' = wall runs along X at z = `at`; 'z' = runs along Z at x = `at`. */
  axis: 'x' | 'z'
  at: number
  from: number
  to: number
  /** Base height. */
  y0?: number
  height: number
  thickness?: number
  /**
   * Doors/windows. Openings stacked vertically (e.g. a ground-floor and a first-floor
   * window) must share the same center and width; columns must not overlap otherwise.
   */
  openings?: Opening[]
  color?: string
}

interface Piece {
  a: number
  b: number
  bottom: number
  top: number
}

/** Axis-aligned wall split into boxes around door/window openings. */
export function Wall({ axis, at, from, to, y0 = 0, height, thickness = WALL_T, openings = [], color = '#f1ece2' }: WallProps) {
  const columns = new Map<string, Opening[]>()
  for (const o of openings) {
    const key = `${o.center}:${o.width}`
    columns.set(key, [...(columns.get(key) ?? []), o])
  }

  const pieces: Piece[] = []
  let cursor = Math.min(from, to)
  const end = Math.max(from, to)
  const sortedColumns = [...columns.values()].sort((p, q) => p[0].center - q[0].center)

  for (const col of sortedColumns) {
    const a = col[0].center - col[0].width / 2
    const b = col[0].center + col[0].width / 2
    if (a > cursor) pieces.push({ a: cursor, b: a, bottom: 0, top: height })
    let y = 0
    for (const o of [...col].sort((p, q) => (p.sill ?? 0) - (q.sill ?? 0))) {
      const sill = o.sill ?? 0
      if (sill > y) pieces.push({ a, b, bottom: y, top: sill })
      y = sill + o.height
    }
    if (y < height) pieces.push({ a, b, bottom: y, top: height })
    cursor = b
  }
  if (cursor < end) pieces.push({ a: cursor, b: end, bottom: 0, top: height })

  // Windows get an invisible "glass" collider so neither the player nor the camera
  // (which sweeps a sphere) can pass through them.
  const glass = openings
    .filter((o) => (o.sill ?? 0) > 0)
    .map((o) => {
      const y = y0 + (o.sill ?? 0) + o.height / 2
      return {
        position: (axis === 'x' ? [o.center, y, at] : [at, y, o.center]) as [number, number, number],
        size: (axis === 'x' ? [o.width, o.height, 0.1] : [0.1, o.height, o.width]) as [number, number, number],
      }
    })

  return (
    <>
      {glass.length > 0 && <BoxColliders boxes={glass} />}
      {pieces.map((p, i) => {
        const len = p.b - p.a
        const mid = (p.a + p.b) / 2
        const h = p.top - p.bottom
        const y = y0 + p.bottom + h / 2
        return (
          <Block
            key={i}
            position={axis === 'x' ? [mid, y, at] : [at, y, mid]}
            size={axis === 'x' ? [len, h, thickness] : [thickness, h, len]}
            color={color}
          />
        )
      })}
    </>
  )
}
