import { Color, Vector3 } from 'three'
import type { TimeOfDay } from '../settings/settings'

/**
 * Lighting per time of day. Atmosphere.tsx eases `atmosphereRuntime` towards the active preset
 * every frame (so switching fades over ~1.5 s); SunLight, the sky light and the lamps read it.
 */
export interface AtmospherePreset {
  /** Sun (or moon) position relative to the player; it shines towards the player. */
  sun: [number, number, number]
  sunColor: string
  sunIntensity: number
  /** Sky dome gradient (the horizon matches the fog) and the sun / moon glow. */
  skyTop: string
  skyHorizon: string
  sunGlow: string
  stars: boolean
  probe: number
  hemi: number
  hemiSky: string
  hemiGround: string
  background: string
  fog: string
  /** Street lamps: 0 off … 1 fully on. */
  lamps: number
}

export const ATMOSPHERE: Record<TimeOfDay, AtmospherePreset> = {
  day: {
    sun: [15, 25, 10], sunColor: '#ffffff', sunIntensity: 1.8,
    skyTop: '#4f8fdc', skyHorizon: '#cfe3f7', sunGlow: '#fff4d6', stars: false,
    probe: 1, hemi: 0.3, hemiSky: '#ffffff', hemiGround: '#c9b99a',
    background: '#bfdbfe', fog: '#cfe3f7', lamps: 0,
  },
  sunset: {
    sun: [-24, 8, -10], sunColor: '#ffb37a', sunIntensity: 1.4,
    skyTop: '#46598f', skyHorizon: '#e7b08c', sunGlow: '#ffb070', stars: false,
    probe: 0.65, hemi: 0.4, hemiSky: '#ffcf9e', hemiGround: '#6b4f3a',
    background: '#f2b48a', fog: '#e7b08c', lamps: 0.4,
  },
  night: {
    sun: [12, 30, -14], sunColor: '#9fb6ff', sunIntensity: 0.4,
    skyTop: '#02040b', skyHorizon: '#0b1324', sunGlow: '#b9c8ff', stars: true,
    probe: 0.14, hemi: 0.35, hemiSky: '#3d5488', hemiGround: '#0b0f1c',
    background: '#060a16', fog: '#0b1324', lamps: 1,
  },
}

/** Indoors at night the room lights are on: warm, bright ambient instead of moonlight. */
export const NIGHT_INDOOR: Partial<AtmospherePreset> = { probe: 0.55, hemi: 1, hemiSky: '#fff1d6', hemiGround: '#8a7a66' }

/** Current (eased) values — read every frame, never re-allocated. */
export const atmosphereRuntime = {
  sun: new Vector3(...ATMOSPHERE.day.sun),
  sunColor: new Color(ATMOSPHERE.day.sunColor),
  sunIntensity: ATMOSPHERE.day.sunIntensity,
  probe: 1,
  hemi: 0.3,
  hemiSky: new Color(ATMOSPHERE.day.hemiSky),
  hemiGround: new Color(ATMOSPHERE.day.hemiGround),
  background: new Color(ATMOSPHERE.day.background),
  fog: new Color(ATMOSPHERE.day.fog),
  skyTop: new Color(ATMOSPHERE.day.skyTop),
  skyHorizon: new Color(ATMOSPHERE.day.skyHorizon),
  sunGlow: new Color(ATMOSPHERE.day.sunGlow),
  lamps: 0,
}
