/**
 * Sound effects: Kenney CC0 .ogg (assets-src/audio/<pack>/, fetched by fetch-sources.mjs audio)
 * → public/audio/<name>-<i>.mp3, per src/audio/sounds.json. Ogg isn't decodable everywhere
 * (older Safari), so every clip is decoded, mixed to mono, peak-normalised (levels are set in
 * code, not by the source files) and encoded as 48 kbps MP3, which every browser plays.
 * Called from build-assets.mjs.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { OggVorbisDecoder } from '@wasm-audio-decoders/ogg-vorbis'
import { Mp3Encoder } from '@breezystack/lamejs'

const ROOT = path.resolve(import.meta.dirname, '..')
const SRC = path.join(ROOT, 'assets-src', 'audio')
const KBPS = 48
const PEAK = 0.9

const exists = (p) => fs.access(p).then(() => true, () => false)

function toMp3(samples, sampleRate) {
  const encoder = new Mp3Encoder(1, sampleRate, KBPS)
  const pcm = Int16Array.from(samples, (v) => Math.max(-1, Math.min(1, v)) * 32767)
  const chunks = []
  for (let i = 0; i < pcm.length; i += 1152) chunks.push(encoder.encodeBuffer(pcm.subarray(i, i + 1152)))
  chunks.push(encoder.flush())
  return Buffer.concat(chunks.map((c) => Buffer.from(c.buffer, c.byteOffset, c.byteLength)))
}

/** Encodes every sound in sounds.json into `outDir`; `log(file, size)` reports each file. */
export async function buildAudio(outDir, log) {
  if (!(await exists(SRC))) {
    console.log('assets-src/audio missing — run `node scripts/fetch-sources.mjs audio` to rebuild sounds.')
    return
  }
  const sounds = JSON.parse(await fs.readFile(path.join(ROOT, 'src', 'audio', 'sounds.json'), 'utf8'))
  const decoder = new OggVorbisDecoder()
  await decoder.ready
  await fs.rm(outDir, { recursive: true, force: true })
  await fs.mkdir(outDir, { recursive: true })
  for (const [name, variants] of Object.entries(sounds)) {
    if (name.startsWith('$')) continue
    for (const [i, [pack, file]] of variants.entries()) {
      await decoder.reset()
      const { channelData, samplesDecoded, sampleRate } = await decoder.decodeFile(await fs.readFile(path.join(SRC, pack, `${file}.ogg`)))
      const mono = new Float32Array(samplesDecoded)
      for (const channel of channelData) for (let s = 0; s < samplesDecoded; s++) mono[s] += channel[s] / channelData.length
      const peak = mono.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1
      for (let s = 0; s < mono.length; s++) mono[s] *= PEAK / peak
      const out = path.join(outDir, `${name}-${i}.mp3`)
      await fs.writeFile(out, toMp3(mono, sampleRate))
      log(out, (await fs.stat(out)).size)
    }
  }
  decoder.free()
}
