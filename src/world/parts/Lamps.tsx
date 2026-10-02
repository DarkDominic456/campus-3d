import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, CanvasTexture, Color, Matrix4, type InstancedMesh, type MeshBasicMaterial } from 'three'
import { Block } from './Block'
import { BUILDING, COURTS, WORLD } from '../layout'
import { atmosphereRuntime } from '../atmospherePresets'

const POLE_H = 3.2
const GLOW_SIZE = 7

/** Street lamps along the paths (x, z). */
const LAMPS: [number, number][] = [
  // Front path, both sides (clear of the flower beds at x ±3.6 and the gate at z 30)
  ...[14, 20, 26, 35, 41].flatMap((z): [number, number][] => [[-4.4, z], [4.4, z]]),
  // Back path and the cross path to the courts
  ...[BUILDING.minZ - 4, BUILDING.minZ - 10].flatMap((z): [number, number][] => [[-2.8, z], [2.8, z]]),
  ...[-20, -10, 10, 20].map((x): [number, number] => [x, -26.2]),
  [COURTS.basketball.cx + 8.5, COURTS.basketball.cz] as [number, number],
  [COURTS.cricket.cx - 15.5, COURTS.cricket.cz] as [number, number],
].filter(([, z]) => z < WORLD.maxZ - 2)

const OFF = new Color('#9ca3af')
const ON = new Color('#ffe2a8')

/** Soft round light pool painted on the ground (additive). */
function glowTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const g = canvas.getContext('2d')!
  const gradient = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(255,214,150,0.9)')
  gradient.addColorStop(0.35, 'rgba(255,190,120,0.35)')
  gradient.addColorStop(1, 'rgba(255,170,90,0)')
  g.fillStyle = gradient
  g.fillRect(0, 0, size, size)
  return new CanvasTexture(canvas)
}

/**
 * Lamp posts that light up at sunset / night (atmosphereRuntime.lamps). No real lights — a
 * glowing head and a painted light pool on the ground cost one draw call each, where point
 * lights would add a cost to every lit pixel.
 */
export function Lamps() {
  const heads = useRef<InstancedMesh>(null)
  const glows = useRef<InstancedMesh>(null)
  const headMaterial = useRef<MeshBasicMaterial>(null)
  const glowMaterial = useRef<MeshBasicMaterial>(null)
  const texture = useMemo(glowTexture, [])
  const color = useMemo(() => new Color(), [])

  useLayoutEffect(() => {
    const m = new Matrix4()
    LAMPS.forEach(([x, z], i) => {
      heads.current?.setMatrixAt(i, m.makeTranslation(x, POLE_H + 0.11, z))
      glows.current?.setMatrixAt(i, m.makeRotationX(-Math.PI / 2).setPosition(x, 0.035, z))
    })
    for (const mesh of [heads.current, glows.current]) {
      if (!mesh) continue
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere()
    }
  }, [])

  useFrame(() => {
    const on = atmosphereRuntime.lamps
    if (headMaterial.current) headMaterial.current.color.copy(color.copy(OFF).lerp(ON, on))
    if (glowMaterial.current && glows.current) {
      glowMaterial.current.opacity = on * 0.6
      glows.current.visible = on > 0.02
    }
  })

  return (
    <group>
      {LAMPS.map(([x, z], i) => (
        <group key={i}>
          <Block position={[x, POLE_H / 2, z]} size={[0.1, POLE_H, 0.1]} color="#1f2937" />
          {/* Dark cap over the bulb */}
          <Block position={[x, POLE_H + 0.27, z]} size={[0.36, 0.06, 0.36]} color="#1f2937" collide={false} />
        </group>
      ))}
      <instancedMesh ref={heads} args={[undefined, undefined, LAMPS.length]} castShadow={false}>
        <boxGeometry args={[0.22, 0.26, 0.22]} />
        <meshBasicMaterial ref={headMaterial} color={OFF} />
      </instancedMesh>
      <instancedMesh ref={glows} args={[undefined, undefined, LAMPS.length]} renderOrder={1}>
        <planeGeometry args={[GLOW_SIZE, GLOW_SIZE]} />
        <meshBasicMaterial ref={glowMaterial} map={texture} transparent opacity={0} depthWrite={false} blending={AdditiveBlending} />
      </instancedMesh>
    </group>
  )
}
