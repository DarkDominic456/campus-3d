/**
 * Downloads the CC0 source textures, HDRI and Poly Haven furniture into assets-src/ (git-ignored: only the
 * converted outputs in public/ are committed). Then `npm run assets` converts them for the web.
 *
 *   node scripts/fetch-sources.mjs [textures] [hdri] [models] [characters] [audio]   (default: all)
 *
 * Sources: Poly Haven (https://polyhaven.com) and ambientCG (https://ambientcg.com), both CC0.
 * Needs `unzip` (macOS / Linux / Git Bash) or `tar` (Windows 10+) for ambientCG zips.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import os from 'node:os'

const ROOT = path.resolve(import.meta.dirname, '..')
const TEX = path.join(ROOT, 'assets-src', 'textures')

/** surface name → source asset. Poly Haven: color + normal (GL); ambientCG: Color + NormalGL. */
export const TEXTURE_SOURCES = {
  plaster: { site: 'polyhaven', id: 'painted_plaster_wall' },
  brick: { site: 'polyhaven', id: 'brick_4' },
  tiles: { site: 'polyhaven', id: 'floor_tiles_02' },
  concrete: { site: 'polyhaven', id: 'brushed_concrete' },
  pavers: { site: 'polyhaven', id: 'brick_pavement_02' },
  asphalt: { site: 'polyhaven', id: 'asphalt_02' },
  soil: { site: 'polyhaven', id: 'brown_mud_dry' },
  grass: { site: 'ambientcg', id: 'Grass005' },
  woodFloor: { site: 'ambientcg', id: 'WoodFloor051' },
  woodFloorLight: { site: 'ambientcg', id: 'WoodFloor062' },
  carpetNavy: { site: 'ambientcg', id: 'Carpet012' },
  carpetBeige: { site: 'ambientcg', id: 'Carpet016' },
}

export const HDRI = { id: 'kloofendal_48d_partly_cloudy_puresky', res: '1k' }

/** Poly Haven models (glTF, 1k textures) → assets-src/polyhaven/<id>/. */
export const POLYHAVEN_MODELS = [
  'SchoolDesk_01',
  'SchoolChair_01',
  'metal_office_desk',
  'sofa_02',
  'modern_arm_chair_01',
  'modern_coffee_table_01',
  'wooden_display_shelves_01',
]

async function download(url, file) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, Buffer.from(await res.arrayBuffer()))
}

async function polyhaven(id, dir) {
  const files = await (await fetch(`https://api.polyhaven.com/files/${id}`)).json()
  const pick = (map) => files[map]?.['1k']?.jpg?.url
  const color = pick('Diffuse') ?? pick('diff')
  const normal = pick('nor_gl')
  if (!color || !normal) throw new Error(`Poly Haven ${id}: missing maps (${Object.keys(files).join(', ')})`)
  await download(color, path.join(dir, 'color.jpg'))
  await download(normal, path.join(dir, 'normal.jpg'))
  return `https://polyhaven.com/a/${id}`
}

async function ambientcg(id, dir) {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'acg-'))
  const zip = path.join(tmp, `${id}.zip`)
  await download(`https://ambientcg.com/get?file=${id}_1K-JPG.zip`, zip)
  try {
    execFileSync('unzip', ['-o', '-q', zip, '-d', tmp])
  } catch {
    execFileSync('tar', ['-xf', zip, '-C', tmp])
  }
  await fs.mkdir(dir, { recursive: true })
  await fs.copyFile(path.join(tmp, `${id}_1K-JPG_Color.jpg`), path.join(dir, 'color.jpg'))
  await fs.copyFile(path.join(tmp, `${id}_1K-JPG_NormalGL.jpg`), path.join(dir, 'normal.jpg'))
  await fs.rm(tmp, { recursive: true, force: true })
  return `https://ambientcg.com/view?id=${id}`
}

/**
 * Quaternius Ultimate Modular Men / Women (CC0, via poly.pizza) → assets-src/quaternius/<variant>.glb.
 * All share one 62-joint skeleton; male-a is also the animation source.
 */
export const CHARACTER_SOURCES = {
  'male-a': { id: 'kZ3DmIoGip', title: 'Casual Character' },
  'male-b': { id: 'gKLBoRsyKe', title: 'Hoodie Character' },
  'male-c': { id: 'JFrLIKqvCH', title: 'Business Man' },
  'male-d': { id: 'Yg2bQZO6Hj', title: 'Worker' },
  'male-e': { id: 'DojKLcO34E', title: 'Beach Character' },
  'male-f': { id: 'BTALZymknF', title: 'Punk' },
  'female-a': { id: 'nIItLV9nxS', title: 'Animated Woman' },
  'female-b': { id: 'qJ2gsTUBHL', title: 'Animated Woman' },
  'female-c': { id: 'ZwF0K7WBmu', title: 'Adventurer' },
  'female-d': { id: 'y9KWOVG21R', title: 'Hooded Adventurer' },
  'female-e': { id: 'djXoqejw6w', title: 'Punk' },
}

/** Kenney CC0 audio packs → assets-src/audio/<pack>/ (only the .ogg files + License.txt). */
export const AUDIO_PACKS = ['impact-sounds', 'interface-sounds']

async function kenneyAudio(pack) {
  const page = await (await fetch(`https://kenney.nl/assets/${pack}`, { headers: { 'user-agent': 'Mozilla/5.0' } })).text()
  const url = page.match(/https:\/\/kenney\.nl\/media\/pages\/assets\/[^"]+\.zip/)?.[0]
  if (!url) throw new Error(`kenney.nl ${pack}: no zip link found`)
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'kenney-'))
  const zip = path.join(tmp, `${pack}.zip`)
  await download(url, zip)
  try {
    execFileSync('unzip', ['-o', '-q', zip, '-d', tmp])
  } catch {
    execFileSync('tar', ['-xf', zip, '-C', tmp])
  }
  const dir = path.join(ROOT, 'assets-src', 'audio', pack)
  await fs.mkdir(dir, { recursive: true })
  for (const file of await fs.readdir(path.join(tmp, 'Audio'))) await fs.copyFile(path.join(tmp, 'Audio', file), path.join(dir, file))
  await fs.copyFile(path.join(tmp, 'License.txt'), path.join(dir, 'License.txt'))
  await fs.writeFile(path.join(dir, 'SOURCE.txt'), `Kenney ${pack}
https://kenney.nl/assets/${pack}
License: CC0 1.0 (public domain)
`)
  await fs.rm(tmp, { recursive: true, force: true })
}

async function polyPizzaModel(variant, { id, title }) {
  const dir = path.join(ROOT, 'assets-src', 'quaternius')
  const page = await (await fetch(`https://poly.pizza/m/${id}`, { headers: { 'user-agent': 'Mozilla/5.0' } })).text()
  const url = page.match(/https:\/\/static\.poly\.pizza\/[0-9a-f-]{36}\.glb/)?.[0]
  if (!url) throw new Error(`poly.pizza ${id}: no GLB link found`)
  await download(url, path.join(dir, `${variant}.glb`))
  await fs.appendFile(path.join(dir, 'SOURCE.txt'), `${variant}: ${title} by Quaternius — https://poly.pizza/m/${id} — CC0 1.0
`)
}

async function polyhavenModel(id) {
  const dir = path.join(ROOT, 'assets-src', 'polyhaven', id)
  const files = await (await fetch(`https://api.polyhaven.com/files/${id}`)).json()
  const gltf = files.gltf?.['1k']?.gltf
  if (!gltf) throw new Error(`Poly Haven ${id}: no 1k glTF`)
  await download(gltf.url, path.join(dir, `${id}.gltf`))
  for (const [rel, file] of Object.entries(gltf.include)) await download(file.url, path.join(dir, rel))
  await fs.writeFile(
    path.join(dir, 'SOURCE.txt'),
    `${id}
https://polyhaven.com/a/${id}
License: CC0 1.0 (public domain)
`,
  )
}

const groups = process.argv.slice(2)
const want = (group) => groups.length === 0 || groups.includes(group)

if (want('textures'))
  for (const [surface, src] of Object.entries(TEXTURE_SOURCES)) {
    const dir = path.join(TEX, surface)
    const page = src.site === 'polyhaven' ? await polyhaven(src.id, dir) : await ambientcg(src.id, dir)
    await fs.writeFile(path.join(dir, 'SOURCE.txt'), `${src.id}\n${page}\nLicense: CC0 1.0 (public domain)\n`)
    console.log(`${surface.padEnd(16)} ← ${src.site}/${src.id}`)
  }

if (want('hdri')) {
  const hdriDir = path.join(ROOT, 'assets-src', 'hdri')
  await download(
    `https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/${HDRI.res}/${HDRI.id}_${HDRI.res}.hdr`,
    path.join(hdriDir, `${HDRI.id}_${HDRI.res}.hdr`),
  )
  await fs.writeFile(
    path.join(hdriDir, 'SOURCE.txt'),
    `${HDRI.id}\nhttps://polyhaven.com/a/${HDRI.id}\nLicense: CC0 1.0 (public domain)\n`,
  )
  console.log(`hdri             ← polyhaven/${HDRI.id}`)
}

if (want('audio')) {
  for (const pack of AUDIO_PACKS) {
    await kenneyAudio(pack)
    console.log(`audio            ← kenney/${pack}`)
  }
}

if (want('characters')) {
  await fs.rm(path.join(ROOT, 'assets-src', 'quaternius', 'SOURCE.txt'), { force: true })
  for (const [variant, src] of Object.entries(CHARACTER_SOURCES)) {
    await polyPizzaModel(variant, src)
    console.log(`character        ← ${src.title} (${variant})`)
  }
}

if (want('models')) {
  for (const id of POLYHAVEN_MODELS) {
    await polyhavenModel(id)
    console.log(`model            ← polyhaven/${id}`)
  }
}
