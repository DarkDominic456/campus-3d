import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import {
  CapsuleCollider,
  RigidBody,
  useRapier,
  type RapierCollider,
  type RapierRigidBody,
} from '@react-three/rapier'
import { Group, MathUtils, Quaternion, Vector3 } from 'three'
import type { KinematicCharacterController } from '@dimforge/rapier3d-compat'
import { externalInput, type ControlName } from './controls'
import { playerRuntime, RUN_SPEED, SPAWN_FACING, SPAWN_POSITION, WALK_SPEED } from './playerRuntime'
import { PlayerModel } from './PlayerModel'
import { isInputLocked, useGameStore, type PlayerAnimation } from '../store/useGameStore'

// Capsule: total height = 2 * (HALF_HEIGHT + RADIUS) = 1.7 m. Wide enough for the
// character model's big head so it doesn't poke through walls.
// 1.7 m tall; slimmer than the old Kenney characters (radius 0.42) to match real proportions.
export const CAPSULE_HALF_HEIGHT = 0.53
export const CAPSULE_RADIUS = 0.32

const JUMP_VELOCITY = 7
const GRAVITY = -20
const ACCELERATION = 12 // higher = snappier start/stop
const TURN_SPEED = 12
const FALL_RESET_Y = -20

const UP = new Vector3(0, 1, 0)

/** Only writes to the store when the animation actually changes. */
function setAnimation(anim: PlayerAnimation) {
  const store = useGameStore.getState()
  if (store.playerAnimation !== anim) store.setPlayerAnimation(anim)
}

export function Player() {
  const bodyRef = useRef<RapierRigidBody>(null)
  const colliderRef = useRef<RapierCollider>(null)
  const modelRef = useRef<Group>(null)
  const controllerRef = useRef<KinematicCharacterController | null>(null)
  const { world, rapier } = useRapier()
  const [, getKeys] = useKeyboardControls<ControlName>()

  // Persistent per-frame scratch state (no allocations in useFrame).
  const velocity = useRef(new Vector3())
  /** Where the player stood before sitting down (null = not seated). */
  const standPosition = useRef<Vector3 | null>(null)
  const grounded = useRef(false)
  const jumpHeld = useRef(false)
  const tmp = useRef({
    forward: new Vector3(),
    right: new Vector3(),
    wish: new Vector3(),
    targetQuat: new Quaternion(),
  })

  useEffect(() => {
    const controller = world.createCharacterController(0.02)
    controller.enableAutostep(0.4, 0.2, false)
    controller.enableSnapToGround(0.4)
    controller.setMaxSlopeClimbAngle(MathUtils.degToRad(50))
    controller.setMinSlopeSlideAngle(MathUtils.degToRad(35))
    controller.setApplyImpulsesToDynamicBodies(true)
    controllerRef.current = controller
    return () => {
      world.removeCharacterController(controller)
      controllerRef.current = null
    }
  }, [world])

  useEffect(() => {
    playerRuntime.body = bodyRef.current
    return () => {
      playerRuntime.body = null
    }
  }, [])

  useFrame((state, delta) => {
    const body = bodyRef.current
    const collider = colliderRef.current
    const controller = controllerRef.current
    if (!body || !collider || !controller) return

    const dt = Math.min(delta, 1 / 20)
    const { forward, right, wish, targetQuat } = tmp.current
    const vel = velocity.current
    const locked = isInputLocked()
    const model = modelRef.current

    // --- Teleport requests (HUD teleport menu, minimap) ---
    const tp = playerRuntime.pendingTeleport
    if (tp) {
      playerRuntime.pendingTeleport = null
      standPosition.current = null // a teleport overrides "stand up where you sat down"
      const [tx, ty, tz] = tp.position
      body.setNextKinematicTranslation({ x: tx, y: ty, z: tz })
      playerRuntime.position.set(tx, ty, tz)
      playerRuntime.facing = tp.facing
      playerRuntime.cameraSnap = { facing: tp.facing }
      model?.quaternion.setFromAxisAngle(UP, tp.facing)
      vel.set(0, 0, 0)
      return
    }

    // --- Seated (FocusState.seat): pin the body to the seat, return to where we stood on exit ---
    const seat = useGameStore.getState().focus?.seat
    if (seat) {
      if (!standPosition.current) {
        const t = body.translation()
        standPosition.current = new Vector3(t.x, t.y, t.z)
      }
      const [sx, sy, sz] = seat.position
      const cy = sy + CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS
      body.setNextKinematicTranslation({ x: sx, y: cy, z: sz })
      playerRuntime.position.set(sx, cy, sz)
      playerRuntime.facing = seat.facing
      model?.quaternion.setFromAxisAngle(UP, seat.facing)
      vel.set(0, 0, 0)
      setAnimation(seat.animation)
      return
    }
    if (standPosition.current) {
      body.setNextKinematicTranslation(standPosition.current)
      playerRuntime.position.copy(standPosition.current)
      standPosition.current = null
      return
    }

    // --- Input (keyboard + external/joystick), relative to camera ---
    const keys = getKeys()
    let inX = 0
    let inY = 0
    let run = false
    let jump = false
    if (!locked) {
      inX = (keys.right ? 1 : 0) - (keys.left ? 1 : 0) + externalInput.move.x
      inY = (keys.forward ? 1 : 0) - (keys.back ? 1 : 0) + externalInput.move.y
      run = keys.run || externalInput.run
      jump = keys.jump || externalInput.jump
    }

    state.camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    right.crossVectors(forward, UP).normalize()
    wish.set(0, 0, 0).addScaledVector(forward, inY).addScaledVector(right, inX)
    if (wish.lengthSq() > 1) wish.normalize()

    const speed = run ? RUN_SPEED : WALK_SPEED
    const blend = 1 - Math.exp(-ACCELERATION * dt)
    vel.x = MathUtils.lerp(vel.x, wish.x * speed, blend)
    vel.z = MathUtils.lerp(vel.z, wish.z * speed, blend)

    // --- Vertical: jump on key press edge, then gravity ---
    if (jump && !jumpHeld.current && grounded.current) {
      vel.y = JUMP_VELOCITY
      grounded.current = false
    }
    jumpHeld.current = jump
    vel.y += GRAVITY * dt

    // --- Collide & slide via Rapier character controller ---
    const desired = { x: vel.x * dt, y: vel.y * dt, z: vel.z * dt }
    controller.computeColliderMovement(collider, desired, rapier.QueryFilterFlags.EXCLUDE_SENSORS)
    const move = controller.computedMovement()
    grounded.current = controller.computedGrounded()
    playerRuntime.grounded = grounded.current
    if (grounded.current && vel.y < 0) vel.y = 0
    if (vel.y > 0 && move.y < desired.y * 0.5) vel.y = 0 // bumped head

    const pos = body.translation()
    let nx = pos.x + move.x
    let ny = pos.y + move.y
    let nz = pos.z + move.z
    if (ny < FALL_RESET_Y) {
      ;[nx, ny, nz] = SPAWN_POSITION
      vel.set(0, 0, 0)
    }
    body.setNextKinematicTranslation({ x: nx, y: ny, z: nz })
    playerRuntime.position.set(nx, ny, nz)

    // --- Face movement direction ---
    if (model && wish.lengthSq() > 0.001) {
      playerRuntime.facing = Math.atan2(wish.x, wish.z)
      targetQuat.setFromAxisAngle(UP, playerRuntime.facing)
      model.quaternion.slerp(targetQuat, 1 - Math.exp(-TURN_SPEED * dt))
    }

    // --- Animation state (only write to store on change) ---
    const horizontalSpeed = Math.hypot(vel.x, vel.z)
    let anim: PlayerAnimation
    if (!grounded.current) anim = vel.y > 0 ? 'jump' : 'fall'
    else if (horizontalSpeed > (WALK_SPEED + RUN_SPEED) / 2) anim = 'run'
    else if (horizontalSpeed > 0.3) anim = 'walk'
    else anim = 'idle'
    setAnimation(anim)
  })

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      colliders={false}
      position={SPAWN_POSITION}
      enabledRotations={[false, false, false]}
      userData={{ isPlayer: true }}
    >
      <CapsuleCollider
        ref={colliderRef}
        args={[CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS]}
        // Kinematic bodies don't report intersections with fixed sensors by default.
        activeCollisionTypes={
          rapier.ActiveCollisionTypes.DEFAULT | rapier.ActiveCollisionTypes.KINEMATIC_FIXED
        }
      />
      <group
        ref={modelRef}
        position={[0, -(CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS), 0]}
        rotation-y={SPAWN_FACING}
      >
        <PlayerModel />
      </group>
    </RigidBody>
  )
}
