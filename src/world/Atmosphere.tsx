import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { Color, Fog, SphericalHarmonics3, Vector3, type HemisphereLight, type LightProbe } from 'three'
import { useTimeOfDay } from '../settings/settings'
import { useGameStore } from '../store/useGameStore'
import { ATMOSPHERE, NIGHT_INDOOR, atmosphereRuntime as rt, type AtmospherePreset } from './atmospherePresets'
import { INDOOR_ZONE_IDS } from './zoneConfig'
import { SunLight } from './SunLight'
import { SkyDome } from './SkyDome'
import skyProbe from './skyProbe.json'

const SKY_PROBE = new SphericalHarmonics3().set(skyProbe.coefficients.map(([r, g, b]) => new Vector3(r, g, b)))

const target = {
  sun: new Vector3(),
  sunColor: new Color(),
  hemiSky: new Color(),
  hemiGround: new Color(),
  background: new Color(),
  fog: new Color(),
  skyTop: new Color(),
  skyHorizon: new Color(),
  sunGlow: new Color(),
}

/**
 * Sky, ambient light, fog and the sun for the current time of day (Settings → Time of day).
 * Values ease towards the preset each frame; at night the room lights come on indoors.
 */
export function Atmosphere() {
  const timeOfDay = useTimeOfDay()
  const indoors = useGameStore((s) => INDOOR_ZONE_IDS.has(s.currentZone))
  const scene = useThree((s) => s.scene)
  const probe = useRef<LightProbe>(null)
  const hemi = useRef<HemisphereLight>(null)
  const snap = useRef(true) // first frame: jump straight to the preset (no fade on load)

  const preset: AtmospherePreset = timeOfDay === 'night' && indoors ? { ...ATMOSPHERE.night, ...NIGHT_INDOOR } : ATMOSPHERE[timeOfDay]

  useEffect(() => {
    target.sun.set(...preset.sun)
    target.sunColor.set(preset.sunColor)
    target.hemiSky.set(preset.hemiSky)
    target.hemiGround.set(preset.hemiGround)
    target.background.set(preset.background)
    target.fog.set(preset.fog)
    target.skyTop.set(preset.skyTop)
    target.skyHorizon.set(preset.skyHorizon)
    target.sunGlow.set(preset.sunGlow)
  }, [preset])

  useFrame((_, delta) => {
    const k = snap.current ? 1 : 1 - Math.exp(-delta * 2.5)
    snap.current = false
    rt.sun.lerp(target.sun, k)
    rt.sunColor.lerp(target.sunColor, k)
    rt.sunIntensity += (preset.sunIntensity - rt.sunIntensity) * k
    rt.probe += (preset.probe - rt.probe) * k
    rt.hemi += (preset.hemi - rt.hemi) * k
    rt.hemiSky.lerp(target.hemiSky, k)
    rt.hemiGround.lerp(target.hemiGround, k)
    rt.background.lerp(target.background, k)
    rt.fog.lerp(target.fog, k)
    rt.skyTop.lerp(target.skyTop, k)
    rt.skyHorizon.lerp(target.skyHorizon, k)
    rt.sunGlow.lerp(target.sunGlow, k)
    rt.lamps += (preset.lamps - rt.lamps) * k

    if (probe.current) probe.current.intensity = rt.probe
    if (hemi.current) {
      hemi.current.intensity = rt.hemi
      hemi.current.color.copy(rt.hemiSky)
      hemi.current.groundColor.copy(rt.hemiGround)
    }
    if (scene.background instanceof Color) scene.background.copy(rt.background)
    if (scene.fog instanceof Fog) scene.fog.color.copy(rt.fog)
  })

  return (
    <>
      <SkyDome />
      {preset.stars && <Stars radius={70} depth={30} count={2500} factor={3} saturation={0} fade speed={0.3} />}
      {/* Sky light baked from a CC0 HDRI into spherical harmonics (npm run assets): soft,
          directional ambient for almost nothing — full image-based lighting was ~10 fps. */}
      <lightProbe ref={probe} args={[SKY_PROBE, 1]} />
      {/* Warm bounce (and the room lights at night) */}
      <hemisphereLight ref={hemi} args={['#ffffff', '#c9b99a', 0.3]} />
      <SunLight />
    </>
  )
}
