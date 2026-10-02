/**
 * Asset pipeline: raw CC0 GLBs in assets-src/ → optimized GLBs in public/models/.
 * Run with `npm run assets` after adding or changing a source model.
 *
 * - Characters: textures embedded, animations stripped (shared clips live in
 *   characters/animations.glb, which has the skeleton but no meshes).
 * - Props (furniture, nature): pivot moved to bottom-center so placement/rotation is predictable.
 * - Poly Haven models (assets-src/polyhaven/<id>/<id>.gltf, fetched by scripts/fetch-sources.mjs,
 *   git-ignored): simplified, textures → WebP 512 px, pivot bottom-center → public/models/polyhaven/.
 * - Trees + bushes: generated with EZ-Tree (scripts/build-trees.mjs) → public/models/trees/.
 * - Everything: dedup + prune + meshopt compression (drei's useGLTF decodes meshopt).
 * - Textures (assets-src/textures/<surface>/{color,normal}.jpg, fetched by
 *   scripts/fetch-sources.mjs and not committed) → public/textures/<surface>/*.webp at 512 px.
 *   The HDRI is baked into a spherical-harmonics light probe (src/world/skyProbe.json). Missing sources are skipped (outputs are committed).
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { Logger, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { center, dedup, meshopt, prune, resample, simplify, textureCompress, weld } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import sharp from 'sharp'
import { FloatType } from 'three'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'

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

const exists = (p) => fs.access(p).then(() => true, () => false)

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

// ---------- Poly Haven models ----------
/** Simplification per model (fraction of triangles kept, max error in m); real-size, so no scale factor. */
const POLYHAVEN_SIMPLIFY = {
  default: { ratio: 0.3, error: 0.005 },
  // 30 of each in the classroom: coarser (1.5 cm error) — thin tube legs don't need the detail.
  SchoolChair_01: { ratio: 0.15, error: 0.015 },
  SchoolDesk_01: { ratio: 0.15, error: 0.015 },
}
const triangles = (doc) =>
  doc
    .getRoot()
    .listMeshes()
    .flatMap((m) => m.listPrimitives())
    .reduce((n, p) => n + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0)

const phSrc = path.join(SRC, 'polyhaven')
if (await exists(phSrc)) {
  await MeshoptSimplifier.ready
  for (const id of await fs.readdir(phSrc)) {
    const file = path.join(phSrc, id, `${id}.gltf`)
    if (!(await exists(file))) continue
    const doc = await io.read(file)
    const before = triangles(doc)
    const { ratio, error } = POLYHAVEN_SIMPLIFY[id] ?? POLYHAVEN_SIMPLIFY.default
    await doc.transform(
      weld(),
      simplify({ simplifier: MeshoptSimplifier, ratio, error }),
      center({ pivot: 'below' }),
      textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [512, 512], quality: 80 }),
    )
    fixMaterials(doc) // no environment map in the scene, so metal parts would render black
    await compress(doc)
    const out = path.join(OUT, 'polyhaven', `${id}.glb`)
    log(out, await write(doc, out))
    console.log(`  triangles ${before} → ${triangles(doc)}`)
  }
} else console.log('assets-src/polyhaven missing — run `node scripts/fetch-sources.mjs models` to rebuild them.')

// ---------- Trees (EZ-Tree, generated) ----------
{
  const { buildTrees } = await import('./build-trees.mjs')
  await buildTrees(path.join(OUT, 'trees'), async (doc, file) => {
    await compress(doc)
    log(file, await write(doc, file))
  })
}

// ---------- Textures + sky light probe ----------
const texSrc = path.join(SRC, 'textures')
const TEX_SIZE = 512 // world-space UVs repeat every ~2 m, so 512 px is ~4 mm/px
if (await exists(texSrc)) {
  for (const surface of await fs.readdir(texSrc)) {
    for (const [map, quality] of [['color', 78], ['normal', 80]]) {
      const src = path.join(texSrc, surface, `${map}.jpg`)
      if (!(await exists(src))) continue
      const out = path.join(ROOT, 'public', 'textures', surface, `${map}.webp`)
      await fs.mkdir(path.dirname(out), { recursive: true })
      await sharp(src).resize(TEX_SIZE, TEX_SIZE, { fit: 'inside' }).webp({ quality }).toFile(out)
      log(out, (await fs.stat(out)).size)
    }
  }
} else console.log('assets-src/textures missing — run `node scripts/fetch-sources.mjs` to rebuild textures.')

/**
 * The HDRI is baked into 9 spherical-harmonic coefficients (three's LightProbe format) in
 * src/world/skyProbe.json: soft sky-coloured ambient light at almost no GPU cost and no
 * runtime download (full image-based lighting cost ~10 fps on the dev laptop's Intel UHD).
 * - The sun disc is clamped out (the scene has its own directional sun).
 * - The lower hemisphere is replaced by grass-coloured bounce light from the upper one.
 */
const GROUND_ALBEDO = [0.18, 0.22, 0.12]
const SUN_CLAMP = 4
function bakeSkyProbe(buffer) {
  const src = new HDRLoader().setDataType(FloatType).parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
  const { width: W, height: H, data } = src
  const stride = data.length / (W * H)
  const basis = (x, y, z) => [
    0.282095,
    0.488603 * y,
    0.488603 * z,
    0.488603 * x,
    1.092548 * x * y,
    1.092548 * y * z,
    0.315392 * (3 * z * z - 1),
    1.092548 * x * z,
    0.546274 * (x * x - y * y),
  ]
  const samples = []
  const irradiance = [0, 0, 0] // on an upward-facing surface, for the ground bounce
  let totalWeight = 0
  for (let py = 0; py < H; py++) {
    const lat = (0.5 - (py + 0.5) / H) * Math.PI // row 0 = straight up
    const weight = Math.cos(lat) // solid angle of an equirect pixel ∝ cos(latitude)
    for (let px = 0; px < W; px++) {
      const phi = ((px + 0.5) / W - 0.5) * 2 * Math.PI
      const dir = [Math.cos(lat) * Math.cos(phi), Math.sin(lat), Math.cos(lat) * Math.sin(phi)]
      const i = (py * W + px) * stride
      const color = [0, 1, 2].map((k) => Math.min(SUN_CLAMP, data[i + k]))
      if (dir[1] > 0) for (let k = 0; k < 3; k++) irradiance[k] += color[k] * dir[1] * weight
      samples.push({ dir, color, weight })
      totalWeight += weight
    }
  }
  const dOmega = (4 * Math.PI) / totalWeight
  const ground = irradiance.map((e, k) => (GROUND_ALBEDO[k] * e * dOmega) / Math.PI)
  const sh = Array.from({ length: 9 }, () => [0, 0, 0])
  for (const { dir, color, weight } of samples) {
    const b = basis(...dir)
    const c = dir[1] > 0 ? color : ground
    for (let j = 0; j < 9; j++) for (let k = 0; k < 3; k++) sh[j][k] += b[j] * c[k] * weight * dOmega
  }
  return sh.map((v) => v.map((x) => Number(x.toFixed(5))))
}

const hdriSrc = path.join(SRC, 'hdri')
if (await exists(hdriSrc)) {
  const [file] = (await fs.readdir(hdriSrc)).filter((f) => f.endsWith('.hdr'))
  const coefficients = bakeSkyProbe(await fs.readFile(path.join(hdriSrc, file)))
  await fs.writeFile(path.join(ROOT, 'src', 'world', 'skyProbe.json'), JSON.stringify({ source: file, coefficients }) + '\n')
  console.log(`src/world/skyProbe.json ← ${file}  (L0 = ${coefficients[0].join(', ')})`)
}

console.log(`\nTotal: ${(total / 1024).toFixed(1)} KB`)
