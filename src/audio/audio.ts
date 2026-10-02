import soundList from './sounds.json'
import { useSettings } from '../settings/settings'

/**
 * Sound for the 3D campus (Web Audio, no three.js import).
 *
 * - Samples: Kenney CC0 effects (sounds.json → public/audio/*.mp3, built by `npm run assets`).
 *   `playSound` picks a random variant and nudges the pitch so repeats don't sound robotic;
 *   `playSoundAt` adds distance fall-off and stereo pan from the camera (`audioListener`).
 * - Ambience is synthesised (no files): wind from filtered noise, birds by day, crickets at
 *   night. Indoors it is muffled through a low-pass, like hearing the outside through walls.
 *
 * Browsers only allow audio after a user gesture: `enableAudio()` (App3D) arms a one-time
 * unlock on the first key / pointer press. Until then — and in the 2D site, which never
 * enables it — every call is a no-op.
 */
export type SoundName = Exclude<keyof typeof soundList, '$comment'>

const VARIANTS = Object.fromEntries(
  Object.entries(soundList)
    .filter(([name]) => !name.startsWith('$'))
    .map(([name, files]) => [name, (files as unknown[]).length]),
) as Record<SoundName, number>

/** Camera position + right vector, written every frame by <AudioListenerSync>. */
export const audioListener = { x: 0, y: 0, z: 0, rightX: 1, rightZ: 0 }

let ctx: AudioContext | null = null
let master: GainNode | null = null
let sfxBus: GainNode | null = null
const buffers = new Map<SoundName, AudioBuffer[]>()
let enabled = false

function applyVolume() {
  if (!ctx || !master) return
  const { muted, volume } = useSettings.getState()
  master.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.05)
}

async function loadAll(context: AudioContext) {
  await Promise.all(
    (Object.keys(VARIANTS) as SoundName[]).map(async (name) => {
      const list = await Promise.all(
        Array.from({ length: VARIANTS[name] }, async (_, i) => {
          const res = await fetch(`/audio/${name}-${i}.mp3`)
          return context.decodeAudioData(await res.arrayBuffer())
        }),
      )
      buffers.set(name, list)
    }),
  ).catch((err) => console.warn('Sound effects failed to load', err))
}

function unlock() {
  if (!enabled) return
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.connect(ctx.destination)
    sfxBus = ctx.createGain()
    sfxBus.connect(master)
    applyVolume()
    void loadAll(ctx)
    ambience.start(ctx, master)
  }
  if (ctx.state === 'suspended') void ctx.resume()
}

/** For debugging / browser checks: context state and how many sounds are decoded. */
export const audioStatus = () => ({ state: ctx?.state ?? 'none', loaded: buffers.size, total: Object.keys(VARIANTS).length })

/** Turns sound on for this page (3D only). Safe to call more than once. */
export function enableAudio() {
  if (enabled) return
  enabled = true
  const onGesture = () => unlock()
  window.addEventListener('pointerdown', onGesture, { capture: true })
  window.addEventListener('keydown', onGesture, { capture: true })
  useSettings.subscribe(() => {
    applyVolume()
    ambience.update()
  })
}

interface PlayOptions {
  /** 0–1 (before the master volume). */
  volume?: number
  /** Playback rate; ±6 % random variation is added. */
  rate?: number
  /** −1 (left) … 1 (right). */
  pan?: number
}

export function playSound(name: SoundName, { volume = 1, rate = 1, pan = 0 }: PlayOptions = {}) {
  const list = buffers.get(name)
  if (!ctx || !sfxBus || !list?.length || volume <= 0.001 || ctx.state !== 'running') return
  const source = ctx.createBufferSource()
  source.buffer = list[Math.floor(Math.random() * list.length)]
  source.playbackRate.value = rate * (0.94 + Math.random() * 0.12)
  const gain = ctx.createGain()
  gain.gain.value = volume
  const panner = ctx.createStereoPanner()
  panner.pan.value = Math.max(-1, Math.min(1, pan))
  source.connect(gain).connect(panner).connect(sfxBus)
  source.start()
}

/** A sound at a world position: fades out by `maxDistance` (m), panned left/right of the camera. */
export function playSoundAt(name: SoundName, x: number, y: number, z: number, options: PlayOptions & { maxDistance?: number } = {}) {
  const { maxDistance = 30, volume = 1 } = options
  const dx = x - audioListener.x
  const dy = y - audioListener.y
  const dz = z - audioListener.z
  const d = Math.hypot(dx, dy, dz)
  const fall = Math.max(0, 1 - d / maxDistance) ** 2
  if (fall <= 0) return
  const pan = d > 0.5 ? ((dx * audioListener.rightX + dz * audioListener.rightZ) / d) * 0.8 : 0
  playSound(name, { ...options, volume: volume * fall, pan })
}

// ---------------------------------------------------------------------------
// Procedural ambience

interface AmbienceState {
  outdoors: boolean
  night: boolean
}

const ambience = (() => {
  const state: AmbienceState = { outdoors: true, night: false }
  let context: AudioContext | null = null
  let bus: GainNode | null = null
  let muffle: BiquadFilterNode | null = null
  let timer = 0

  function noiseBuffer(c: AudioContext) {
    // Brown noise: integrated white noise — a soft, wind-like rumble.
    const length = c.sampleRate * 4
    const buffer = c.createBuffer(1, length, c.sampleRate)
    const data = buffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
      data[i] = last * 3.5
    }
    return buffer
  }

  function chirp(c: AudioContext, out: AudioNode, at: number) {
    // A bird call: 2–5 quick rising whistles.
    const notes = 2 + Math.floor(Math.random() * 4)
    const f0 = 2600 + Math.random() * 1600
    const pan = c.createStereoPanner()
    pan.pan.value = Math.random() * 1.6 - 0.8
    pan.connect(out)
    for (let n = 0; n < notes; n++) {
      const t = at + n * (0.09 + Math.random() * 0.05)
      const osc = c.createOscillator()
      const g = c.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(f0 * (1 + n * 0.04), t)
      osc.frequency.exponentialRampToValueAtTime(f0 * (1.25 + Math.random() * 0.3), t + 0.07)
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.05, t + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0005, t + 0.08)
      osc.connect(g).connect(pan)
      osc.start(t)
      osc.stop(t + 0.1)
    }
  }

  function cricket(c: AudioContext, out: AudioNode, at: number) {
    // A cricket: a burst of 3–4 short 4.6 kHz pulses.
    const pan = c.createStereoPanner()
    pan.pan.value = Math.random() * 1.6 - 0.8
    pan.connect(out)
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.frequency.value = 4400 + Math.random() * 500
    g.gain.value = 0
    osc.connect(g).connect(pan)
    const pulses = 3 + Math.floor(Math.random() * 2)
    for (let p = 0; p < pulses; p++) {
      const t = at + p * 0.045
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.018, t + 0.008)
      g.gain.linearRampToValueAtTime(0, t + 0.03)
    }
    osc.start(at)
    osc.stop(at + pulses * 0.045 + 0.05)
  }

  function schedule() {
    if (!context || !muffle) return
    const { ambience: on } = useSettings.getState()
    if (on && context.state === 'running') {
      const at = context.currentTime + 0.05
      if (state.night) cricket(context, muffle, at)
      else if (Math.random() < (state.outdoors ? 0.8 : 0.3)) chirp(context, muffle, at)
    }
    const next = state.night ? 400 + Math.random() * 900 : 1800 + Math.random() * 4500
    timer = window.setTimeout(schedule, next)
  }

  return {
    start(c: AudioContext, out: AudioNode) {
      context = c
      bus = c.createGain()
      muffle = c.createBiquadFilter()
      muffle.type = 'lowpass'
      muffle.connect(bus).connect(out)

      const wind = c.createBufferSource()
      wind.buffer = noiseBuffer(c)
      wind.loop = true
      const windFilter = c.createBiquadFilter()
      windFilter.type = 'lowpass'
      windFilter.frequency.value = 420
      const windGain = c.createGain()
      windGain.gain.value = 0.05
      // Slow gusts: an LFO wobbling the wind level.
      const lfo = c.createOscillator()
      lfo.frequency.value = 0.08
      const lfoDepth = c.createGain()
      lfoDepth.gain.value = 0.03
      lfo.connect(lfoDepth).connect(windGain.gain)
      wind.connect(windFilter).connect(windGain).connect(muffle)
      wind.start()
      lfo.start()

      this.update()
      window.clearTimeout(timer)
      schedule()
    },
    set(patch: Partial<AmbienceState>) {
      Object.assign(state, patch)
      this.update()
    },
    update() {
      if (!context || !bus || !muffle) return
      const { ambience: on } = useSettings.getState()
      const t = context.currentTime
      bus.gain.setTargetAtTime(on ? (state.outdoors ? 1 : 0.35) : 0, t, 0.4)
      muffle.frequency.setTargetAtTime(state.outdoors ? 18000 : 700, t, 0.3)
    },
  }
})()

/** Ambience context: is the listener outdoors, and is it night (crickets instead of birds)? */
export const setAmbience = (patch: Partial<AmbienceState>) => ambience.set(patch)
