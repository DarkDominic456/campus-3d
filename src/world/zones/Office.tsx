import { Suspense } from 'react'
import type { Vector3Tuple } from 'three'
import { Block } from '../parts/Block'
import { BoxColliders } from '../parts/BoxColliders'
import { Model, ModelInstances } from '../parts/Model'
import { Floor, Plant } from '../parts/Props'
import { Sign } from '../parts/Sign'
import { Interactable } from '../../interactables/Interactable'
import { useGameStore } from '../../store/useGameStore'
import { StaticNpc, seatPosition } from '../../npc/StaticNpc'
import { npcLook } from '../../npc/variants'
import { BUILDING, FLOOR1_Y, HALL } from '../layout'

const DESK_ZS = [-11, -6, -1, 4]
const DESK_X = -16.4
const DESK_TOP = 0.77
const CHAIR_X = -15.55
const OFFICE_CHAIR_SEAT = 0.5
const FACE_WALL = -Math.PI / 2 // −X
const FACE_DOOR = Math.PI / 2 // +X
const RECEPTION = { x: -9.5, z: -8 }
/** Workstations with someone working (index into DESK_ZS). */
const WORKERS = [0, 1, 3]

const at = (x: number, z: number, y = 0): Vector3Tuple => [x, y, z]

/** First floor, west. Everything is positioned relative to the first-floor surface. */
export function Office() {
  const midZ = (BUILDING.minZ + BUILDING.maxZ) / 2

  return (
    <group position={[0, FLOOR1_Y, 0]}>
      <Floor position={[(BUILDING.minX + HALL.minX) / 2, 0.01, midZ]} size={[HALL.minX - BUILDING.minX, BUILDING.maxZ - BUILDING.minZ]} color="#cfd8dc" />

      {/* Reception counter (custom block — no counter in the furniture kit) */}
      <Block position={[RECEPTION.x, 0.55, RECEPTION.z]} size={[0.9, 1.1, 3.6]} color="#78350f" />
      <Block position={[RECEPTION.x + 0.05, 1.12, RECEPTION.z]} size={[1.1, 0.06, 3.8]} color="#d6d3d1" />
      <Sign text="RECEPTION" position={[RECEPTION.x, 3.1, RECEPTION.z]} rotationY={FACE_DOOR} width={2.6} background="#0369a1" />

      <BoxColliders
        boxes={[
          // Workstations: desk + chair + worker
          ...DESK_ZS.map((z) => ({ position: at(-16.05, z, 0.6), size: [1.7, 1.2, 1.5] as Vector3Tuple })),
          { position: at(-5.2, 1, 0.5), size: [0.95, 1, 2.2] }, // waiting sofa
          { position: at(-6.6, 1, 0.25), size: [1, 0.5, 0.6] }, // coffee table
          { position: at(-10.7, RECEPTION.z, 0.9), size: [0.6, 1.8, 0.6] }, // receptionist
          { position: at(-4.7, -12, 0.9), size: [0.5, 1.8, 0.5] }, // coat rack
        ]}
      />

      <Suspense fallback={null}>
        <Model name="computerScreen" position={at(RECEPTION.x - 0.15, RECEPTION.z - 0.9, 1.15)} rotationY={FACE_WALL} />
        <StaticNpc variant="female-a" position={at(-10.7, RECEPTION.z)} facing={FACE_DOOR} animation="talk" />

        {/* Workstations along the west wall */}
        <ModelInstances name="desk" items={DESK_ZS.map((z) => ({ position: at(DESK_X, z), rotationY: FACE_DOOR }))} />
        <ModelInstances name="computerScreen" items={DESK_ZS.map((z) => ({ position: at(DESK_X - 0.2, z, DESK_TOP), rotationY: FACE_DOOR }))} />
        <ModelInstances name="computerKeyboard" items={DESK_ZS.map((z) => ({ position: at(DESK_X + 0.12, z, DESK_TOP), rotationY: FACE_DOOR }))} />
        <ModelInstances name="chairDesk" items={DESK_ZS.map((z) => ({ position: at(CHAIR_X, z), rotationY: FACE_WALL }))} />
        {WORKERS.map((i) => {
          const look = npcLook(i, 3)
          return (
            <StaticNpc
              key={i}
              variant={look.variant}
              phase={look.phase}
              position={seatPosition(CHAIR_X, OFFICE_CHAIR_SEAT, DESK_ZS[i])}
              facing={FACE_WALL}
              animation="study"
            />
          )
        })}

        {/* Waiting area */}
        <Model name="loungeDesignSofa" position={at(-5.2, 1)} rotationY={FACE_WALL} />
        <Model name="tableCoffee" position={at(-6.6, 1)} rotationY={Math.PI / 2} />
        <StaticNpc variant="male-d" position={seatPosition(-5.25, 0.42, 1.5)} facing={FACE_WALL} animation="sit" />
        <Model name="coatRackStanding" position={at(-4.7, -12)} />
        <Model name="bookcaseClosedWide" position={at(-13, BUILDING.minZ + 0.45)} />
      </Suspense>

      <Plant position={[-4.8, 0, 9.2]} />
      <Plant position={[-17.2, 0, -13.2]} />
      <Plant position={[-7.2, 0, -10.8]} />

      {/* Reception: "Request a Demo" form and "View Pricing" */}
      <Interactable
        id="office-reception"
        prompt="Press E to talk to reception"
        position={[-8.3, 0, RECEPTION.z]}
        triggerSize={[0.9, 1.2, 1.9]}
        promptOffset={[0, 2.3, 0]}
        onInteract={() => useGameStore.getState().openOverlay('office', { tab: 'demo' })}
      />
    </group>
  )
}
