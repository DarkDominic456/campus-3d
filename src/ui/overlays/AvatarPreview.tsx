import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import type { CharacterVariant } from '../../assets/models'
import { CharacterModel } from '../../characters/CharacterModel'

/** Small live 3D preview of an avatar. Lazy-loaded so the 2D site never pulls in three.js. */
export default function AvatarPreview({ variant }: { variant: CharacterVariant }) {
  return (
    <Canvas camera={{ position: [0, 0.2, 3.4], fov: 35 }} dpr={[1, 1.5]}>
      <ambientLight intensity={1.2} />
      <directionalLight position={[2, 4, 3]} intensity={1.5} />
      <Suspense fallback={null}>
        <group position={[0, -0.75, 0]}>
          <CharacterModel key={variant} variant={variant} animation="wave" />
        </group>
      </Suspense>
    </Canvas>
  )
}
