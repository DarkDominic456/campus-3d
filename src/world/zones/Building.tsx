import { Block } from '../parts/Block'
import { Wall, type Opening } from '../parts/Wall'
import { Sign } from '../parts/Sign'
import { Floor, Plant } from '../parts/Props'
import { BUILDING, DOOR_H, FLOOR1_Y, HALL, ROOF_Y, SLAB_BOTTOM, STAIRS, WALL_T } from '../layout'

const { minX, maxX, minZ, maxZ } = BUILDING
const H = WALL_T / 2
const OUTER = '#e7dccb'
const INNER = '#f5f1ea'
const SLAB_T = FLOOR1_Y - SLAB_BOTTOM
const FLOOR1_WALL_H = ROOF_Y - FLOOR1_Y

/** Window pair (ground + first floor) sharing one column. */
const windows = (center: number, width = 2.4): Opening[] => [
  { center, width, height: 1.6, sill: 1.1 },
  { center, width, height: 1.6, sill: FLOOR1_Y + 1.1 },
]
const mainDoor = (): Opening[] => [
  { center: 0, width: 4, height: DOOR_H },
  { center: 0, width: 4, height: 1.6, sill: FLOOR1_Y + 1.1 },
]
const facadeOpenings = [...windows(-13), ...windows(-8), ...mainDoor(), ...windows(8), ...windows(13)]
const sideOpenings = [...windows(-10.5), ...windows(6.5)]

/** Shell of the two-storey building: outer walls, room walls, first-floor slab, stairs, roof, signage. */
export function Building() {
  const midX = (STAIRS.minX + STAIRS.maxX) / 2
  const stairW = STAIRS.maxX - STAIRS.minX

  return (
    <group>
      {/* ---------- Outer walls (full height, both floors) ---------- */}
      <Wall axis="x" at={maxZ} from={minX - H} to={maxX + H} height={ROOF_Y} openings={facadeOpenings} color={OUTER} />
      <Wall axis="x" at={minZ} from={minX - H} to={maxX + H} height={ROOF_Y} openings={facadeOpenings} color={OUTER} />
      <Wall axis="z" at={minX} from={minZ} to={maxZ} height={ROOF_Y} openings={sideOpenings} color={OUTER} />
      <Wall axis="z" at={maxX} from={minZ} to={maxZ} height={ROOF_Y} openings={sideOpenings} color={OUTER} />

      {/* ---------- Ground floor room walls ---------- */}
      <Wall axis="z" at={HALL.minX} from={minZ} to={maxZ} height={SLAB_BOTTOM} color={INNER}
        openings={[{ center: 4, width: 2.4, height: 3 }]} />
      <Wall axis="z" at={HALL.maxX} from={minZ} to={maxZ} height={SLAB_BOTTOM} color={INNER}
        openings={[{ center: 6, width: 2.4, height: 3 }]} />

      {/* ---------- First floor room walls ---------- */}
      <Wall axis="z" at={HALL.minX} from={minZ} to={maxZ} y0={FLOOR1_Y} height={FLOOR1_WALL_H} color={INNER}
        openings={[{ center: -8, width: 2.4, height: 3 }]} />
      <Wall axis="z" at={HALL.maxX} from={minZ} to={maxZ} y0={FLOOR1_Y} height={FLOOR1_WALL_H} color={INNER}
        openings={[{ center: -9, width: 2.4, height: 3 }]} />

      {/* ---------- First floor slab, with a hole over the stairs ---------- */}
      <Slab x0={minX} x1={STAIRS.minX} z0={minZ} z1={maxZ} />
      <Slab x0={STAIRS.minX} x1={maxX} z0={STAIRS.zStart} z1={maxZ} />
      <Slab x0={STAIRS.minX} x1={maxX} z0={minZ} z1={STAIRS.zEnd} />
      <Slab x0={STAIRS.maxX} x1={maxX} z0={STAIRS.zEnd} z1={STAIRS.zStart} />

      {/* Railings around the stairwell (first floor) */}
      <Block position={[STAIRS.minX, FLOOR1_Y + 0.5, (STAIRS.zStart + STAIRS.zEnd) / 2]}
        size={[0.1, 1, STAIRS.zStart - STAIRS.zEnd]} color="#475569" />
      <Block position={[midX, FLOOR1_Y + 0.5, STAIRS.zStart]} size={[stairW, 1, 0.1]} color="#475569" />

      {/* ---------- Stairs: solid steps; the controller's autostep climbs them ---------- */}
      {Array.from({ length: STAIRS.steps }, (_, i) => {
        const top = (i + 1) * STAIRS.rise
        return (
          <Block
            key={i}
            position={[midX, top / 2, STAIRS.zStart - (i + 0.5) * STAIRS.run]}
            size={[stairW, top, STAIRS.run]}
            color={i % 2 ? '#a8a29e' : '#b8b2ad'}
          />
        )
      })}

      {/* ---------- Roof (no shadow, so sunlight still reaches the rooms) ---------- */}
      <Block position={[0, ROOF_Y + 0.15, (minZ + maxZ) / 2]} size={[maxX - minX + 0.6, 0.3, maxZ - minZ + 0.6]}
        color="#9a6b50" castShadow={false} />
      {/* First-floor ceiling (faces down) so rooms don't see the roof's underside */}
      <mesh position={[0, ROOF_Y - 0.01, (minZ + maxZ) / 2]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[maxX - minX, maxZ - minZ]} />
        <meshStandardMaterial color="#ece7df" />
      </mesh>

      {/* ---------- Floors ---------- */}
      <Floor position={[0, 0.02, (minZ + maxZ) / 2]} size={[HALL.maxX - HALL.minX, maxZ - minZ]} color="#d6d3d1" />
      <Floor position={[0, 0.02, maxZ + 1.5]} size={[6, 3]} color="#a8a29e" />
      <Floor position={[0, 0.02, minZ - 1.5]} size={[6, 3]} color="#a8a29e" />

      {/* ---------- Hall furniture ---------- */}
      <Plant position={[-3.3, 0, 9.2]} />
      <Plant position={[3.3, 0, 9.2]} />
      <Plant position={[-3.3, 0, -13.2]} />
      <Plant position={[-3.3, FLOOR1_Y, -13.2]} />
      <Plant position={[-3.3, FLOOR1_Y, 9.2]} />
      <Directory />

      {/* ---------- Signs ---------- */}
      <Sign text="CAMPUS BUILDING" position={[0, 3.75, maxZ + H + 0.03]} width={4.2} fontSize={0.34} />
      <Sign text="CAMPUS BUILDING" position={[0, 3.75, minZ - H - 0.03]} rotationY={Math.PI} width={4.2} fontSize={0.34} />
      <Sign text="OUTDOOR GROUND" position={[0, 3.6, minZ + H + 0.03]} width={3.2} background="#166534" />
      <Sign text="CLASSROOMS" position={[HALL.minX + H + 0.03, 3.5, 4]} rotationY={Math.PI / 2} background="#b45309" />
      <Sign text="GAMING ROOM" position={[HALL.maxX - H - 0.03, 3.5, 6]} rotationY={-Math.PI / 2} background="#6d28d9" />
      <Sign text={'UPSTAIRS\nOffice · Conference'} position={[HALL.maxX - H - 0.03, 2.4, 3.3]} rotationY={-Math.PI / 2}
        width={1.9} height={0.8} fontSize={0.2} />
      <Sign text="OFFICE" position={[HALL.minX + H + 0.03, FLOOR1_Y + 3.5, -8]} rotationY={Math.PI / 2} background="#0369a1" />
      <Sign text="CONFERENCE ROOM" position={[HALL.maxX - H - 0.03, FLOOR1_Y + 3.5, -9]} rotationY={-Math.PI / 2}
        width={2.8} background="#be185d" />
    </group>
  )
}

function Slab({ x0, x1, z0, z1 }: { x0: number; x1: number; z0: number; z1: number }) {
  return (
    <Block
      position={[(x0 + x1) / 2, SLAB_BOTTOM + SLAB_T / 2, (z0 + z1) / 2]}
      size={[x1 - x0, SLAB_T, z1 - z0]}
      color="#d6d3d1"
      castShadow={false}
    />
  )
}

/** Free-standing directory board just inside the main entrance. */
function Directory() {
  const pos: [number, number, number] = [-2.4, 0, 7.4]
  return (
    <group>
      <Block position={[pos[0], 0.6, pos[2]]} size={[0.12, 1.2, 0.12]} color="#475569" />
      <Block position={[pos[0], 1.75, pos[2]]} size={[1.8, 1.3, 0.08]} color="#1e293b" />
      <Sign
        text={'DIRECTORY\n< Classrooms\nGaming Room >\nStairs: Office, Conference\nBack door: Outdoor Ground'}
        position={[pos[0], 1.75, pos[2] + 0.05]}
        width={1.7}
        height={1.2}
        fontSize={0.13}
      />
    </group>
  )
}
