/**
 * Asset pipeline: raw CC0 GLBs in assets-src/ → optimized GLBs in public/models/.
 * Run with `npm run assets` after adding or changing a source model.
 *
 * - Characters: textures embedded, animations stripped (shared clips live in
 *   characters/animations.glb, which has the skeleton but no meshes).
 * - Props (furniture, nature): pivot moved to bottom-center so placement/rotation is predictable.
 * - Everything: dedup + prune + meshopt compression (drei's useGLTF decodes meshopt).
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { Logger, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { center, dedup, meshopt, prune, resample } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'

const ROOT = path.resolve(import.meta.dirname, '..')
const SRC = path.join(ROOT, 'assets-src')
const OUT = path.join(ROOT, 'public', 'models')

/** Clips kept from the character pack (the rest — wheelchair, combat… — are dropped). */
const KEEP_ANIMATIONS = ['idle', 'walk', 'sprint', 'jump', 'fall', 'sit', 'interact-right', 'holding-both', 'emote-yes', 'pick-up']
const ANIMATION_SOURCE = 'character-male-a.glb'

/**
 * Material fixes applied to props. Kenney's nature kit ships with metallicFactor = 1
 * (renders black without an env map) and teal leaves that clash with the campus grass.
 * Colors are linear RGBA.
 */
const COLOR_OVERRIDES = {
  leafsGreen: [0.1, 0.42, 0.09, 1],
  leafsDark: [0.04, 0.24, 0.05, 1],
  grass: [0.12, 0.45, 0.1, 1],
}

function fixMaterials(doc) {
  for (const material of doc.getRoot().listMaterials()) {
    material.setMetallicFactor(0)
    const color = COLOR_OVERRIDES[material.getName()]
    if (color) material.setBaseColorFactor(color)
  }
}

const PROP_PACKS = [
  { dir: 'kenney-furniture-kit', out: 'furniture' },
  { dir: 'kenney-nature-kit', out: 'nature' },
]

await MeshoptEncoder.ready
await MeshoptDecoder.ready
const io = new NodeIO()
  .setLogger(new Logger(Logger.Verbosity.WARN))
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder })

const compress = (doc, pruneOptions = {}) =>
  doc.transform(dedup(), prune(pruneOptions), meshopt({ encoder: MeshoptEncoder, level: 'medium' }))

async function write(doc, file) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await io.write(file, doc)
  const { size } = await fs.stat(file)
  return size
}

let total = 0
const log = (file, size) => {
  total += size
  console.log(`${path.relative(OUT, file).padEnd(40)} ${(size / 1024).toFixed(1).padStart(7)} KB`)
}

// ---------- Characters ----------
const charDir = path.join(SRC, 'kenney-mini-characters')
const charFiles = (await fs.readdir(charDir)).filter((f) => f.startsWith('character-') && f.endsWith('.glb'))

for (const file of charFiles) {
  const doc = await io.read(path.join(charDir, file))
  for (const anim of doc.getRoot().listAnimations()) anim.dispose()
  await compress(doc)
  const out = path.join(OUT, 'characters', file.replace('character-', ''))
  log(out, await write(doc, out))
}

{
  const doc = await io.read(path.join(charDir, ANIMATION_SOURCE))
  for (const anim of doc.getRoot().listAnimations()) {
    if (!KEEP_ANIMATIONS.includes(anim.getName())) anim.dispose()
  }
  // Keep only the skeleton hierarchy: drop meshes/skins so the file is just clips.
  for (const node of doc.getRoot().listNodes()) {
    if (node.getMesh()) node.setMesh(null)
    if (node.getSkin()) node.setSkin(null)
  }
  await doc.transform(resample())
  await compress(doc, { keepLeaves: true }) // leaf bones have no content but clips target them
  const missing = KEEP_ANIMATIONS.filter((n) => !doc.getRoot().listAnimations().some((a) => a.getName() === n))
  if (missing.length) throw new Error(`Missing animations: ${missing.join(', ')}`)
  const out = path.join(OUT, 'characters', 'animations.glb')
  log(out, await write(doc, out))
}

// ---------- Props ----------
for (const pack of PROP_PACKS) {
  const dir = path.join(SRC, pack.dir)
  for (const file of (await fs.readdir(dir)).filter((f) => f.endsWith('.glb'))) {
    const doc = await io.read(path.join(dir, file))
    await doc.transform(center({ pivot: 'below' }))
    fixMaterials(doc)
    await compress(doc)
    const out = path.join(OUT, pack.out, file)
    log(out, await write(doc, out))
  }
}

console.log(`\nTotal: ${(total / 1024).toFixed(1)} KB`)
