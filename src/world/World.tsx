import { lazy, Suspense } from 'react'
import { Sky } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { BatchProvider } from './parts/Batch'
import { ReadySignal } from './ReadySignal'
import { Ground } from './Ground'
import { SunLight } from './SunLight'
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
      <fog attach="fog" args={['#cfe3f7', 70, 160]} />
      <Sky sunPosition={[30, 40, 20]} />
      {/* Warm ground bounce + a little ambient keep ceilings and shaded rooms from going black */}
      <hemisphereLight args={['#ffffff', '#c9b99a', 1]} />
      <ambientLight intensity={0.35} />
      <SunLight />

      {/* timeStep="vary": one physics step per rendered frame, so the kinematic
          character controller always reads an up-to-date position. */}
      <Physics timeStep="vary" gravity={[0, -20, 0]}>
        <Ground />
        {/* Static props/blocks below are drawn as shared InstancedMeshes */}
        <BatchProvider>
          <Campus />
          <Gate />
          <Building />
          <Classroom />
          <GamingRoom />
          <Office />
          <ConferenceRoom />
          <Suspense fallback={null}>
            <OutdoorGround />
          </Suspense>
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
