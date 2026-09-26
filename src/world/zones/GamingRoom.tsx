import { Suspense } from 'react'
import { Block } from '../parts/Block'
import { BoxColliders } from '../parts/BoxColliders'
import { Model } from '../parts/Model'
import { Floor, Plant } from '../parts/Props'
import { Sign } from '../parts/Sign'
import { Interactable } from '../../interactables/Interactable'
import { useGameStore } from '../../store/useGameStore'
import type { GameId } from '../../minigames/registry'
import { StaticNpc, seatPosition } from '../../npc/StaticNpc'
import { BUILDING, HALL } from '../layout'

const TV_Z = -2
const CABINET_X = 17.35
const CABINET_TOP = 0.62
const SOFA_X = 12.6
const SOFA_SEAT_HEIGHT = 0.45
const FACE_TV = Math.PI / 2 // +X
const FACE_ROOM = -Math.PI / 2 // −X
const CABINET_Z = BUILDING.minZ + 0.6
/** Arcade cabinets along the back wall, each running one mini game. */
const CABINETS: { x: number; game: GameId; label: string; color: string }[] = [
  { x: 7, game: 'snake', label: 'SNAKE', color: '#1d4ed8' },
  { x: 9.5, game: 'puzzle', label: 'PUZZLE', color: '#be123c' },
  { x: 12, game: 'paint', label: 'PAINT', color: '#047857' },
]
const openArcade = (game?: GameId) => useGameStore.getState().openOverlay('arcade', game ? { game } : {})

export function GamingRoom() {
  const midZ = (BUILDING.minZ + BUILDING.maxZ) / 2

  return (
    <group>
      <Floor position={[(HALL.maxX + BUILDING.maxX) / 2, 0.02, midZ]} size={[BUILDING.maxX - HALL.maxX, BUILDING.maxZ - BUILDING.minZ]} color="#3f3f5a" />

      <BoxColliders
        boxes={[
          { position: [CABINET_X, 0.5, TV_Z], size: [0.55, 1, 1.7] }, // TV cabinet
          { position: [SOFA_X, 0.5, TV_Z], size: [0.95, 1, 2.2] }, // sofa + gamers
          { position: [17.45, 0.65, TV_Z - 1.6], size: [0.35, 1.3, 0.35] }, // speakers
          { position: [17.45, 0.65, TV_Z + 1.6], size: [0.35, 1.3, 0.35] },
          { position: [14.8, 0.45, -6], size: [1, 0.9, 1] }, // lounge chairs
          { position: [14.8, 0.45, 2], size: [1, 0.9, 1] },
        ]}
      />

      <Suspense fallback={null}>
        <Model name="rugRectangle" position={[15, 0.03, TV_Z]} rotationY={Math.PI / 2} scale={1.3} />
        <Model name="cabinetTelevision" position={[CABINET_X, 0, TV_Z]} rotationY={FACE_ROOM} />
        <Model name="televisionModern" position={[CABINET_X + 0.1, CABINET_TOP, TV_Z]} rotationY={FACE_ROOM} scale={1.6} />
        <Model name="speaker" position={[17.45, 0, TV_Z - 1.6]} rotationY={FACE_ROOM} />
        <Model name="speaker" position={[17.45, 0, TV_Z + 1.6]} rotationY={FACE_ROOM} />
        <Model name="loungeSofa" position={[SOFA_X, 0, TV_Z]} rotationY={FACE_TV} scale={1.1} />
        <Model name="loungeChair" position={[14.8, 0, -6]} rotationY={Math.PI * 0.75} scale={1.2} />
        <Model name="loungeChair" position={[14.8, 0, 2]} rotationY={Math.PI * 0.25} scale={1.2} />

        {/* Two players on the sofa, one at the arcade */}
        <StaticNpc variant="male-c" position={seatPosition(SOFA_X + 0.05, SOFA_SEAT_HEIGHT, TV_Z - 0.5)} facing={FACE_TV} animation="game" />
        <StaticNpc variant="female-d" position={seatPosition(SOFA_X + 0.05, SOFA_SEAT_HEIGHT, TV_Z + 0.5)} facing={FACE_TV} animation="game" phase={0.4} />
        <StaticNpc variant="male-e" position={[14, 0, BUILDING.minZ + 1.6]} facing={-Math.PI * 0.6} animation="idle" />
      </Suspense>

      {/* Console pads on the TV cabinet */}
      <Block position={[CABINET_X - 0.05, CABINET_TOP + 0.08, TV_Z - 0.55]} size={[0.3, 0.16, 0.4]} color="#f8fafc" collide={false} />
      <Block position={[CABINET_X - 0.05, CABINET_TOP + 0.08, TV_Z + 0.55]} size={[0.3, 0.16, 0.4]} color="#111827" collide={false} />

      {/* Arcade cabinets along the back wall — each opens its game directly */}
      <BoxColliders boxes={[{ position: [14, 0.9, BUILDING.minZ + 1.6], size: [0.7, 1.8, 0.7] }]} />
      {CABINETS.map((c) => (
        <group key={c.game}>
          <Block position={[c.x, 1, CABINET_Z]} size={[1, 2, 0.9]} color={c.color} />
          <mesh position={[c.x, 1.45, CABINET_Z + 0.46]}>
            <boxGeometry args={[0.7, 0.5, 0.02]} />
            <meshStandardMaterial color="#000" emissive="#22d3ee" emissiveIntensity={0.7} />
          </mesh>
          <Sign text={c.label} position={[c.x, 2.2, CABINET_Z + 0.2]} width={1} height={0.32} fontSize={0.18} background={c.color} />
          <Interactable
            id={`arcade-${c.game}`}
            prompt={`Press E to play ${c.label.toLowerCase()}`}
            position={[c.x, 0, CABINET_Z + 1.1]}
            triggerSize={[0.55, 1.2, 0.5]}
            promptOffset={[0, 2.7, -0.6]}
            onInteract={() => openArcade(c.game)}
          />
        </group>
      ))}

      {/* Ping-pong table */}
      <Block position={[8.5, 0.38, 3]} size={[2.7, 0.76, 1.5]} color="#15803d" />

      <Plant position={[4.8, 0, 9.2]} />
      <Plant position={[17.2, 0, 9.2]} />
      <Sign text="GAME ZONE" position={[11, 3.2, BUILDING.minZ + 0.19]} width={3} background="#6d28d9" color="#f0abfc" />

      {/* Console: the mini-game launcher */}
      <Interactable
        id="gaming-console"
        prompt="Press E to play"
        position={[15.4, 0, TV_Z]}
        triggerSize={[1.2, 1.2, 2]}
        promptOffset={[0, 2.3, 0]}
        onInteract={() => openArcade()}
      />
    </group>
  )
}
