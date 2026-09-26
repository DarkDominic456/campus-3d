import { Suspense, useMemo } from 'react'
import type { Vector3Tuple } from 'three'
import { Block } from '../parts/Block'
import { BoxColliders, type ColliderBox } from '../parts/BoxColliders'
import { Model, ModelInstances, type ModelPlacement } from '../parts/Model'
import { Floor, Plant } from '../parts/Props'
import { Sign } from '../parts/Sign'
import { Interactable } from '../../interactables/Interactable'
import { useGameStore } from '../../store/useGameStore'
import { StaticNpc, seatPosition } from '../../npc/StaticNpc'
import { npcLook } from '../../npc/variants'
import { BUILDING, HALL } from '../layout'

/** Desk rows (X) and columns (Z). Students sit on the +X side facing the whiteboard (−X). */
const ROWS = [-12.5, -10, -7.5]
const COLS = [-10, -6.5, -3, 0.5, 4]
const SEAT_OFFSETS = [-0.37, 0.37]
const DESK_TOP = 0.77
const CHAIR_OFFSET_X = 0.72
export const CHAIR_SEAT_HEIGHT = 0.42
const FACE_WHITEBOARD = -Math.PI / 2
const WALL_FACE = BUILDING.minX + 0.19

/** The seat the player can use (last row, last column — nearest the door). */
export const PLAYER_SEAT = { x: ROWS[2] + CHAIR_OFFSET_X, z: COLS[4] + SEAT_OFFSETS[1] }

/** Which seats have a studying NPC (by seat index); the rest stay empty. */
const OCCUPIED = new Set([0, 1, 3, 5, 6, 8, 11, 12, 14, 15, 17, 18, 20, 23, 24, 26])

const SEAT_FOCUS_ID = 'classroom-seat'
/** Delay before the laptop page opens, so the camera can glide over the shoulder first. */
const OPEN_LAPTOP_DELAY_MS = 900

/** Sit at the free seat, look over the right shoulder at the laptop, then open the Learning page. */
function sitAtLaptop() {
  const { x, z } = PLAYER_SEAT
  useGameStore.getState().enterFocus({
    id: SEAT_FOCUS_ID,
    seat: { position: seatPosition(x, CHAIR_SEAT_HEIGHT, z), facing: FACE_WHITEBOARD, animation: 'study' },
    // Player faces −X, so their right shoulder is on the −Z side.
    camera: { position: [x + 1.35, 2.3, z - 0.8], target: [ROWS[2] + 0.05, 0.85, z] },
    exitWithOverlay: true,
  })
  window.setTimeout(() => {
    const s = useGameStore.getState()
    if (s.focus?.id === SEAT_FOCUS_ID && !s.activeOverlay) s.openOverlay('learning')
  }, OPEN_LAPTOP_DELAY_MS)
}

interface Seat {
  x: number
  z: number
  index: number
}

export function Classroom() {
  const layout = useMemo(() => {
    const desks: ModelPlacement[] = []
    const chairs: ModelPlacement[] = []
    const laptops: ModelPlacement[] = []
    const colliders: ColliderBox[] = []
    const seats: Seat[] = []
    for (const x of ROWS) {
      for (const z of COLS) {
        desks.push({ position: [x, 0, z], rotationY: Math.PI / 2 })
        colliders.push({ position: [x, 0.39, z], size: [0.8, 0.78, 1.5] })
        // Chairs + seated students behind each desk: one box keeps the player out.
        colliders.push({ position: [x + CHAIR_OFFSET_X, 0.6, z], size: [0.46, 1.2, 1.2] })
        for (const dz of SEAT_OFFSETS) {
          chairs.push({ position: [x + CHAIR_OFFSET_X, 0, z + dz], rotationY: FACE_WHITEBOARD })
          laptops.push({ position: [x + 0.08, DESK_TOP, z + dz], rotationY: Math.PI / 2 })
          seats.push({ x: x + CHAIR_OFFSET_X, z: z + dz, index: seats.length })
        }
      }
    }
    return { desks, chairs, laptops, colliders, seats }
  }, [])

  const midZ = (BUILDING.minZ + BUILDING.maxZ) / 2
  const students = layout.seats.filter((s) => OCCUPIED.has(s.index) && !(s.x === PLAYER_SEAT.x && s.z === PLAYER_SEAT.z))
  const teacher: Vector3Tuple = [-16.7, 0, -2]

  return (
    <group>
      <Floor position={[(BUILDING.minX + HALL.minX) / 2, 0.02, midZ]} size={[HALL.minX - BUILDING.minX, BUILDING.maxZ - BUILDING.minZ]} color="#c8a27a" />

      {/* Whiteboard */}
      <Block position={[BUILDING.minX + 0.2, 1.9, -2]} size={[0.06, 1.5, 6]} color="#f8fafc" collide={false} />
      <Block position={[BUILDING.minX + 0.19, 1.9, -2]} size={[0.04, 1.6, 6.1]} color="#64748b" collide={false} />
      <Sign text="CLASSROOM" position={[WALL_FACE, 3.3, -2]} rotationY={Math.PI / 2} background="#b45309" />

      <BoxColliders
        boxes={[
          ...layout.colliders,
          { position: [-15.4, 0.39, -2], size: [0.8, 0.78, 1.5] }, // teacher desk
          { position: [-12.2, 0.9, BUILDING.minZ + 0.45], size: [4.8, 1.8, 0.55] }, // bookcases
        ]}
      />

      <Suspense fallback={null}>
        <ModelInstances name="desk" items={layout.desks} />
        <ModelInstances name="chair" items={layout.chairs} />
        <ModelInstances name="laptop" items={layout.laptops} />

        {/* Teacher desk + monitor, bookcases on the back wall */}
        <Model name="desk" position={[-15.4, 0, -2]} rotationY={-Math.PI / 2} />
        <Model name="computerScreen" position={[-15.3, DESK_TOP, -2]} rotationY={-Math.PI / 2} />
        <ModelInstances
          name="bookcaseOpen"
          items={[-14, -12.2, -10.4].map((x) => ({ position: [x, 0, BUILDING.minZ + 0.45] as Vector3Tuple }))}
        />

        {/* NPC students (typing on laptops) and the teacher */}
        {students.map((s) => {
          const look = npcLook(s.index, 1)
          return (
            <StaticNpc
              key={s.index}
              variant={look.variant}
              phase={look.phase}
              position={seatPosition(s.x, CHAIR_SEAT_HEIGHT, s.z)}
              facing={FACE_WHITEBOARD}
              animation="study"
            />
          )
        })}
        <StaticNpc variant="female-c" position={teacher} facing={Math.PI / 2} animation="talk" />
      </Suspense>

      <Plant position={[-17.2, 0, 9.2]} />
      <Plant position={[-4.8, 0, -13.2]} />

      {/* Empty seat: sit down and the laptop opens the Learning page */}
      <Interactable
        id="classroom-seat"
        prompt="Press E to sit"
        position={[PLAYER_SEAT.x, 0, PLAYER_SEAT.z]}
        triggerSize={[0.75, 1, 0.45]}
        promptOffset={[0, 1.7, 0]}
        onInteract={sitAtLaptop}
      />
    </group>
  )
}
