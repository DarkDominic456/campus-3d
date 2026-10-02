import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BackSide, ShaderMaterial, type Mesh } from 'three'
import { atmosphereRuntime as rt } from './atmospherePresets'

const RADIUS = 110 // inside the camera's far plane (130)

/**
 * Cheap gradient sky: zenith → horizon (= fog colour, so distant ground melts into it) plus a
 * soft sun / moon glow. Replaces drei's physically based <Sky>, which cost ~5–8 fps outdoors
 * on integrated GPUs and couldn't fade between times of day. Colours come from
 * atmosphereRuntime, so day ↔ sunset ↔ night transitions are smooth.
 */
export function SkyDome() {
  const mesh = useRef<Mesh>(null)
  const material = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTop: { value: rt.skyTop },
          uHorizon: { value: rt.skyHorizon },
          uGlow: { value: rt.sunGlow },
          uSunDir: { value: rt.sun.clone().normalize() },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_Position.z = gl_Position.w; // always at the far plane
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uTop;
          uniform vec3 uHorizon;
          uniform vec3 uGlow;
          uniform vec3 uSunDir;
          varying vec3 vDir;
          void main() {
            vec3 dir = normalize(vDir);
            float h = max(dir.y, 0.0);
            vec3 color = mix(uHorizon, uTop, pow(h, 0.55));
            float d = max(dot(dir, uSunDir), 0.0);
            color += uGlow * (pow(d, 48.0) * 0.45 + smoothstep(0.9993, 0.9997, d) * 0.9);
            gl_FragColor = vec4(color, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    [],
  )

  useFrame(({ camera }) => {
    mesh.current?.position.copy(camera.position)
    ;(material.uniforms.uSunDir.value as typeof rt.sun).copy(rt.sun).normalize()
  })

  return (
    <mesh ref={mesh} material={material} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[RADIUS, 32, 16]} />
    </mesh>
  )
}
