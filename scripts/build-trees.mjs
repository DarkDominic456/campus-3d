/**
 * Procedural trees and bushes from EZ-Tree (MIT, https://github.com/dgreenheck/ez-tree) → GLB.
 * Generated once at build time (no runtime dependency): presets are thinned out for a web
 * campus (~2–4k triangles each), scaled to real heights, and get
 * - bark: EZ-Tree's CC0 bark colour texture (256 px WebP), UVs pre-multiplied by the repeat;
 * - leaves: the alpha leaf-card texture as glTF alpha MASK, double-sided, with normals pointing
 *   out from the canopy centre so the foliage shades like a soft volume instead of flat cards.
 * Called from build-assets.mjs.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { register } from 'node:module'
import { Document } from '@gltf-transform/core'
import sharp from 'sharp'

register('./lib/ez-tree-hooks.mjs', import.meta.url)
const EZ = path.join(import.meta.dirname, '..', 'node_modules', '@dgreenheck', 'ez-tree', 'src', 'lib')
const { Tree } = await import(new URL(`file:///${path.join(EZ, 'tree.js').replace(/\\/g, '/')}`).href)

/** name → preset, seed, target height (m), detail tweaks. */
export const TREE_MODELS = {
  oak: { preset: 'Oak Medium', seed: 11, height: 9, leafScale: 2.2, leafKeep: 0.35 },
  ash: { preset: 'Ash Medium', seed: 23, height: 10.5, leafScale: 2.2, leafKeep: 0.3 },
  aspen: { preset: 'Aspen Medium', seed: 37, height: 11, leafScale: 1.8, leafKeep: 0.55 },
  pine: { preset: 'Pine Medium', seed: 41, height: 10, leafScale: 1.9, leafKeep: 0.35 },
  bush: { preset: 'Bush 2', seed: 5, height: 1.4, leafScale: 2, leafKeep: 0.8 },
}

function thinOut(options, { leafScale, leafKeep }) {
  const b = options.branch
  for (const level of Object.keys(b.segments)) {
    if (Number(level) > 0) b.segments[level] = Math.max(3, Math.round(b.segments[level] * 0.7))
    b.sections[level] = Math.max(1, Math.round(b.sections[level] * (Number(level) > 0 ? 0.5 : 0.7)))
  }
  options.leaves.count = Math.max(2, Math.round(options.leaves.count * leafKeep))
  options.leaves.size *= leafScale
}

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const hexToLinear = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map((v) => srgbToLinear(v / 255))

async function webp(file, { alpha }) {
  return sharp(file).resize(256, 256).webp({ quality: 80, alphaQuality: alpha ? 90 : undefined }).toBuffer()
}

/** Builds every tree GLB into `outDir`; `finish(doc, file)` compresses + writes + logs. */
export async function buildTrees(outDir, finish) {
  for (const [name, spec] of Object.entries(TREE_MODELS)) {
    const tree = new Tree()
    tree.loadPreset(spec.preset)
    tree.options.seed = spec.seed
    thinOut(tree.options, spec)
    tree.generate()

    const bGeo = tree.branchesMesh.geometry
    const lGeo = tree.leavesMesh.geometry
    lGeo.computeBoundingBox()
    bGeo.computeBoundingBox()
    const top = Math.max(lGeo.boundingBox.max.y, bGeo.boundingBox.max.y)
    const s = spec.height / top

    const doc = new Document()
    const buffer = doc.createBuffer()
    const acc = (array, type) => doc.createAccessor().setArray(array).setType(type).setBuffer(buffer)
    const scaled = (attr) => Float32Array.from(attr.array, (v) => v * s)

    // Bark
    const o = tree.options
    const barkUv = Float32Array.from(bGeo.attributes.uv.array, (v, i) => (i % 2 === 0 ? v * o.bark.textureScale.x : v / o.bark.textureScale.y))
    const barkTex = doc
      .createTexture(`${o.bark.type}_bark`)
      .setImage(await webp(path.join(EZ, 'assets', 'bark', `${o.bark.type}_color_1k.jpg`), { alpha: false }))
      .setMimeType('image/webp')
    const barkMat = doc
      .createMaterial('bark')
      .setBaseColorTexture(barkTex)
      .setBaseColorFactor([...hexToLinear(o.bark.tint), 1])
      .setRoughnessFactor(1)
      .setMetallicFactor(0)
    const branches = doc
      .createPrimitive()
      .setAttribute('POSITION', acc(scaled(bGeo.attributes.position), 'VEC3'))
      .setAttribute('NORMAL', acc(Float32Array.from(bGeo.attributes.normal.array), 'VEC3'))
      .setAttribute('TEXCOORD_0', acc(barkUv, 'VEC2'))
      .setIndices(acc(Uint32Array.from(bGeo.index.array), 'SCALAR'))
      .setMaterial(barkMat)

    // Leaves: normals from the canopy centre (biased upward), for soft volumetric shading.
    const pos = scaled(lGeo.attributes.position)
    const bb = lGeo.boundingBox
    const c = [((bb.min.x + bb.max.x) / 2) * s, ((bb.min.y + bb.max.y) / 2) * s, ((bb.min.z + bb.max.z) / 2) * s]
    const normals = new Float32Array(pos.length)
    for (let i = 0; i < pos.length; i += 3) {
      const n = [pos[i] - c[0], (pos[i + 1] - c[1]) * 0.7 + spec.height * 0.15, pos[i + 2] - c[2]]
      const len = Math.hypot(...n) || 1
      normals.set(n.map((v) => v / len), i)
    }
    const leafTex = doc
      .createTexture(`${o.leaves.type}_leaves`)
      .setImage(await webp(path.join(EZ, 'assets', 'leaves', `${o.leaves.type}_color.png`), { alpha: true }))
      .setMimeType('image/webp')
    const leafMat = doc
      .createMaterial('leaves')
      .setBaseColorTexture(leafTex)
      .setBaseColorFactor([...hexToLinear(o.leaves.tint), 1])
      .setAlphaMode('MASK')
      .setAlphaCutoff(0.5)
      .setDoubleSided(true)
      .setRoughnessFactor(0.9)
      .setMetallicFactor(0)
    const leaves = doc
      .createPrimitive()
      .setAttribute('POSITION', acc(pos, 'VEC3'))
      .setAttribute('NORMAL', acc(normals, 'VEC3'))
      .setAttribute('TEXCOORD_0', acc(Float32Array.from(lGeo.attributes.uv.array), 'VEC2'))
      .setIndices(acc(Uint32Array.from(lGeo.index.array), 'SCALAR'))
      .setMaterial(leafMat)

    const mesh = doc.createMesh(name).addPrimitive(branches).addPrimitive(leaves)
    doc.createScene().addChild(doc.createNode(name).setMesh(mesh))
    const file = path.join(outDir, `${name}.glb`)
    await fs.mkdir(outDir, { recursive: true })
    await finish(doc, file)
    console.log(`  ${spec.preset}: ${bGeo.index.count / 3} bark + ${lGeo.index.count / 3} leaf triangles, ${spec.height} m`)
  }
}
