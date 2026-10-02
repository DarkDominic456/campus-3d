import { Suspense, useMemo } from 'react'
import { Block } from '../parts/Block'
import { BoxColliders } from '../parts/BoxColliders'
import { Model, ModelInstances, type ModelPlacement } from '../parts/Model'
import { Floor, Plant } from '../parts/Props'
import { Interactable } from '../../interactables/Interactable'
import { useGameStore } from '../../store/useGameStore'
import { PresentationScreen, PRESENTATION_FOCUS_ID } from './PresentationScreen'
import { StaticNpc, seatPosition } from '../../npc/StaticNpc'
import { npcLook } from '../../npc/variants'
import { BUILDING, FLOOR1_Y, HALL } from '../layout'

const TABLE = { x: 10.5, z: -2, length: 7, width: 2.2 }
const CHAIR_XS = [7.8, 9.15, 10.5, 11.85, 13.2]
const CHAIR_GAP = 0.5
const CHAIR_SEAT_HEIGHT = 0.42
/** Seats with a meeting attendee: [side (-1 | 1), index into CHAIR_XS]. */
const ATTENDEES: [number, number][] = [[-1, 1], [1, 2], [-1, 3]]

const SCREEN_X = BUILDING.maxX - 0.2
const SCREEN_Y = 2.2

/** Camera framing the whole screen (world space — the room is on the first floor). */
function watchPresentation() {
  useGameStore.getState().enterFocus({
    id: PRESENTATION_FOCUS_ID,
    camera: {
      position: [SCREEN_X - 3.2, FLOOR1_Y + SCREEN_Y, TABLE.z],
      target: [SCREEN_X, FLOOR1_Y + SCREEN_Y, TABLE.z],
    },
    hidePlayer: true,
    hint: '← → change slide ·',
  })
}

const chairZ = (side: number) => TABLE.z + side * (TABLE.width / 2 + CHAIR_GAP)
/** Chairs on the −Z side face +Z (rotation 0); the +Z side faces −Z. */
const facing = (side: number) => (side < 0 ? 0 : Math.PI)

/** First floor, east. Everything is positioned relative to the first-floor surface. */
export function ConferenceRoom() {
  const midZ = (BUILDING.minZ + BUILDING.maxZ) / 2
  const chairs = useMemo(() => {
    const list: ModelPlacement[] = []
    for (const side of [-1, 1]) {
      for (const x of CHAIR_XS) list.push({ position: [x, 0, chairZ(side)], rotationY: facing(side) })
    }
    return list
  }, [])

  return (
    <group position={[0, FLOOR1_Y, 0]}>
      <Floor position={[(HALL.maxX + BUILDING.maxX) / 2, 0.01, midZ]} size={[BUILDING.maxX - HALL.maxX, BUILDING.maxZ - BUILDING.minZ]} surface="carpetBeige" />

      {/* Presentation screen on the east wall: HTML slides via drei <Html transform> */}
      <PresentationScreen position={[SCREEN_X, SCREEN_Y, TABLE.z]} rotationY={-Math.PI / 2} />

      {/* Long table (custom block — the kit's tables are too small) */}
      <Block position={[TABLE.x, 0.38, TABLE.z]} size={[TABLE.length, 0.76, TABLE.width]} color="#57534e" />
      <BoxColliders
        boxes={[-1, 1].map((side) => ({
          position: [TABLE.x, 0.5, chairZ(side)],
          size: [TABLE.length - 0.6, 1, 0.5],
        }))}
      />

      <Suspense fallback={null}>
        <ModelInstances name="chairCushion" items={chairs} />
        {ATTENDEES.map(([side, i], n) => {
          const look = npcLook(n, 5)
          return (
            <StaticNpc
              key={n}
              variant={look.variant}
              phase={look.phase}
              position={seatPosition(CHAIR_XS[i], CHAIR_SEAT_HEIGHT, chairZ(side) - side * 0.05)}
              facing={facing(side)}
              animation={n === 1 ? 'talk' : 'sit'}
            />
          )
        })}
        <Model name="speaker" position={[BUILDING.maxX - 0.4, 0, TABLE.z - 2.8]} rotationY={-Math.PI / 2} />
        <Model name="speaker" position={[BUILDING.maxX - 0.4, 0, TABLE.z + 2.8]} rotationY={-Math.PI / 2} />
      </Suspense>

      <Plant position={[4.8, 0, 9.2]} />
      <Plant position={[17.2, 0, 9.2]} />
      <Plant position={[17.2, 0, -13.2]} />

      <Interactable
        id="conference-screen"
        prompt="Press E to view presentation"
        position={[15.6, 0, TABLE.z]}
        triggerSize={[1.4, 1.2, 2.6]}
        promptOffset={[0, 2.4, 0]}
        onInteract={watchPresentation}
      />
    </group>
  )
}
