import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, DoubleSide, Shape, type Group, type Mesh, type MeshBasicMaterial } from 'three'
import { playerRuntime } from '../player/playerRuntime'
import { useGameStore } from '../store/useGameStore'
import { BUILDING, FLOOR1_Y, SLAB_BOTTOM, STAIRS } from '../world/layout'
import { currentTourStep, useTourStore } from './tour'

type Point = [number, number, number]

const STAIRS_X = (STAIRS.minX + STAIRS.maxX) / 2
const STAIRS_BOTTOM: Point = [STAIRS_X, 0, STAIRS.zStart + 1.2]
const STAIRS_TOP: Point = [STAIRS_X, FLOOR1_Y, STAIRS.zEnd - 1]
const FRONT_DOOR: Point = [0, 0, BUILDING.maxZ + 1.5]
const BACK_DOOR: Point = [0, 0, BUILDING.minZ - 1.5]

const inBuilding = (x: number, z: number) => x > BUILDING.minX && x < BUILDING.maxX && z > BUILDING.minZ && z < BUILDING.maxZ
const onStairs = (x: number, z: number) => x > STAIRS.minX - 0.3 && x < STAIRS.maxX + 0.3 && z < STAIRS.zStart + 0.3 && z > STAIRS.zEnd - 0.6
const nearestDoor = (z: number) => (z < (BUILDING.minZ + BUILDING.maxZ) / 2 ? BACK_DOOR : FRONT_DOOR)

/**
 * Next point to head for on the way to `target`: through a door when entering / leaving the
 * building (or going around it front ↔ back), up / down the stairs when the floors differ.
 * `y` is the player's feet height.
 */
export function guideWaypoint(x: number, y: number, z: number, target: Point): Point {
  const [tx, ty, tz] = target
  const playerFloor = y > SLAB_BOTTOM - 0.5 ? 1 : 0
  const targetFloor = ty > SLAB_BOTTOM - 0.5 ? 1 : 0
  const playerIn = inBuilding(x, z)
  const targetIn = inBuilding(tx, tz)
  if (onStairs(x, z) && playerIn && playerFloor !== targetFloor) return targetFloor === 1 ? STAIRS_TOP : STAIRS_BOTTOM
  if (playerIn && targetIn) {
    if (playerFloor === targetFloor) return target
    return playerFloor === 0 ? STAIRS_BOTTOM : STAIRS_TOP
  }
  if (playerIn) return playerFloor === 1 ? STAIRS_TOP : nearestDoor(tz)
  if (targetIn) return nearestDoor(z)
  // Both outside: if the building is between them, walk through the hall.
  const across = (z > BUILDING.maxZ && tz < BUILDING.minZ) || (z < BUILDING.minZ && tz > BUILDING.maxZ)
  if (across && Math.abs(x) < BUILDING.maxX + 4) return nearestDoor(z)
  return target
}

/** Chevron pointing along +Z, lying on the ground. */
function chevronShape() {
  const s = new Shape()
  s.moveTo(0, 0.45)
  s.lineTo(0.38, -0.05)
  s.lineTo(0.2, -0.05)
  s.lineTo(0, 0.2)
  s.lineTo(-0.2, -0.05)
  s.lineTo(-0.38, -0.05)
  s.closePath()
  return s
}

/** Tour guide in the 3D world: a light beacon at the current step and an arrow at your feet. */
export function TourGuide() {
  const active = useTourStore((s) => s.active)
  const done = useTourStore((s) => s.done)
  const step = active ? currentTourStep(done) : null
  const shape = useMemo(chevronShape, [])

  const beacon = useRef<Group>(null)
  const ring = useRef<Mesh>(null)
  const arrow = useRef<Group>(null)
  const arrowMaterial = useRef<MeshBasicMaterial>(null)

  useFrame(({ clock }) => {
    if (!step || !beacon.current || !arrow.current || !ring.current) return
    const { focus, activeOverlay } = useGameStore.getState()
    const busy = focus !== null || activeOverlay !== null
    const t = clock.elapsedTime
    const [tx, ty, tz] = step.target
    beacon.current.position.set(tx, ty, tz)
    beacon.current.visible = !busy
    const pulse = (t % 1.6) / 1.6
    ring.current.scale.setScalar(0.6 + pulse * 1.2)
    ;(ring.current.material as MeshBasicMaterial).opacity = 0.7 * (1 - pulse)

    const p = playerRuntime.position
    const feet = p.y - 0.85
    const [wx, , wz] = guideWaypoint(p.x, feet, p.z, step.target)
    const dx = wx - p.x
    const dz = wz - p.z
    const close = Math.hypot(tx - p.x, tz - p.z) < 3 && Math.abs(ty - feet) < 1.5
    arrow.current.visible = !busy && !close && Math.hypot(dx, dz) > 0.3
    const yaw = Math.atan2(dx, dz)
    arrow.current.position.set(p.x + Math.sin(yaw) * 1.3, feet + 0.06, p.z + Math.cos(yaw) * 1.3)
    arrow.current.rotation.y = yaw
    if (arrowMaterial.current) arrowMaterial.current.opacity = 0.65 + 0.25 * Math.sin(t * 5)
  })

  if (!step) return null
  return (
    <>
      <group ref={beacon}>
        <mesh position={[0, 4, 0]} renderOrder={2}>
          <cylinderGeometry args={[0.45, 0.45, 8, 24, 1, true]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.22} side={DoubleSide} depthWrite={false} blending={AdditiveBlending} fog={false} />
        </mesh>
        <mesh ref={ring} position={[0, 0.05, 0]} rotation-x={-Math.PI / 2} renderOrder={2}>
          <ringGeometry args={[0.55, 0.75, 40]} />
          <meshBasicMaterial color="#7dd3fc" transparent opacity={0.6} depthWrite={false} blending={AdditiveBlending} />
        </mesh>
      </group>
      <group ref={arrow}>
        <mesh rotation-x={-Math.PI / 2} renderOrder={2}>
          <shapeGeometry args={[shape]} />
          <meshBasicMaterial ref={arrowMaterial} color="#38bdf8" transparent depthWrite={false} side={DoubleSide} />
        </mesh>
      </group>
    </>
  )
}
