import type { Vector3Tuple } from 'three'
import { WalkingNpc, type WalkingNpcProps } from './WalkingNpc'
import { npcLook } from './variants'
import { BUILDING, FLOOR1_Y } from '../world/layout'

type Route = Omit<WalkingNpcProps, 'variant' | 'phase'>

const p = (x: number, z: number, y = 0): Vector3Tuple => [x, y, z]

/** Ambient walkers. Paths avoid furniture; stairs are not used (NPCs stay on one floor). */
const ROUTES: Route[] = [
  // Front plaza: up and down the path between gate and building
  { path: [p(-1.6, 25), p(-1.6, 12.5)], mode: 'pingpong', speed: 1.3 },
  { path: [p(1.8, 13), p(1.8, 26), p(6, 26), p(6, 13)], mode: 'loop', speed: 1.2 },
  // Main hall: front door ↔ back door along the west side (stairs are on the east side)
  { path: [p(-0.6, 6.5), p(-0.6, BUILDING.minZ + 2)], mode: 'pingpong', speed: 1.4, pause: [2, 4] },
  // First floor corridor
  { path: [p(-2.5, 8, FLOOR1_Y), p(-2.5, BUILDING.minZ + 1.5, FLOOR1_Y)], mode: 'pingpong', speed: 1.1, pause: [2, 5] },
  // Outdoor: along the back path and cross path to the courts
  { path: [p(1, -17), p(1, -28), p(-27, -28), p(-27, -31)], mode: 'pingpong', speed: 1.5 },
  { path: [p(-1, -18), p(-1, -26.8), p(30, -26.8), p(30, -34)], mode: 'pingpong', speed: 1.3 },
]

export function WalkingNpcs() {
  return (
    <>
      {ROUTES.map((route, i) => {
        const look = npcLook(i, 7)
        return <WalkingNpc key={i} {...route} variant={look.variant} phase={look.phase} />
      })}
    </>
  )
}
