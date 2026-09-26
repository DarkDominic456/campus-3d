import { Suspense } from 'react'
import { Text } from '@react-three/drei'
import { Block } from './Block'
import type { Vector3Tuple } from 'three'

interface SignProps {
  text: string
  position: Vector3Tuple
  /** Rotation around Y; the sign's text faces +Z at 0. */
  rotationY?: number
  width?: number
  height?: number
  fontSize?: number
  color?: string
  background?: string
}

/** Flat board with a label — door signs, directions, zone names. Visual only. */
export function Sign({
  text,
  position,
  rotationY = 0,
  width = 2.4,
  height = 0.55,
  fontSize = 0.28,
  color = '#f8fafc',
  background = '#1e293b',
}: SignProps) {
  return (
    <group position={position} rotation-y={rotationY}>
      {/* Board goes through the static batch (one draw call per colour for all signs). */}
      <Block position={[0, 0, 0]} size={[width, height, 0.05]} color={background} collide={false} castShadow={false} />
      <Suspense fallback={null}>
        <Text
          position={[0, 0, 0.03]}
          fontSize={fontSize}
          color={color}
          anchorX="center"
          anchorY="middle"
          maxWidth={width - 0.2}
          textAlign="center"
          lineHeight={1.3}
        >
          {text}
        </Text>
      </Suspense>
    </group>
  )
}
