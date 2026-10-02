import { lazy, Suspense } from 'react'
import { Physics } from '@react-three/rapier'
import { BatchProvider } from './parts/Batch'
import { ReadySignal } from './ReadySignal'
import { ZoneLayer } from './layers'
import { Ground } from './Ground'
import { Atmosphere } from './Atmosphere'
import { Lamps } from './parts/Lamps'
import { Campus } from './zones/Campus'
import { Gate } from './zones/Gate'
import { Building } from './zones/Building'
import { Classroom } from './zones/Classroom'
import { GamingRoom } from './zones/GamingRoom'
import { Office } from './zones/Office'
import { ConferenceRoom } from './zones/ConferenceRoom'
import { Player } from '../player/Player'
import { WalkingNpcs } from '../npc/WalkingNpcs'
import { preloadModels } from '../assets/preload'
import { ThirdPersonCamera } from '../player/ThirdPersonCamera'

preloadModels()

// Heavy / far-away zones are code-split and stream in after the first frame.
const OutdoorGround = lazy(() => import('./zones/OutdoorGround').then((m) => ({ default: m.OutdoorGround })))

export function World() {
  return (
    <>
      <color attach="background" args={['#bfdbfe']} />
      {/* Fog ends just inside the camera's far plane (App3D), so far geometry is culled unseen. */}
      <fog attach="fog" args={['#cfe3f7', 55, 125]} />
      {/* Sky, sun, ambient light and fog colour for the time of day */}
      <Atmosphere />

      {/* timeStep="vary": one physics step per rendered frame, so the kinematic
          character controller always reads an up-to-date position. */}
      <Physics timeStep="vary" gravity={[0, -20, 0]}>
        <Ground />
        {/* Static props/blocks below are drawn as shared InstancedMeshes */}
        <BatchProvider>
          <Campus />
          <Lamps />
          <Gate />
          <Building />
          {/* Zones the player can't see from where they stand are hidden (world/layers.tsx). */}
          <ZoneLayer layer="groundInterior">
            <Classroom />
            <GamingRoom />
          </ZoneLayer>
          <ZoneLayer layer="firstInterior">
            <Office />
            <ConferenceRoom />
          </ZoneLayer>
          <ZoneLayer layer="outdoor">
            <Suspense fallback={null}>
              <OutdoorGround />
            </Suspense>
          </ZoneLayer>
        </BatchProvider>
        <Suspense fallback={null}>
          <WalkingNpcs />
        </Suspense>
        {/* Player before camera so the camera follows this frame's position */}
        <Player />
        <ThirdPersonCamera />
        <ReadySignal />
      </Physics>
    </>
  )
}
