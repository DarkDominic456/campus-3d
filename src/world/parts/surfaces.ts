import { MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, TextureLoader, Vector2, type Texture } from 'three'

/**
 * Textured PBR surfaces (CC0, Poly Haven / ambientCG — see scripts/fetch-sources.mjs) for
 * walls, floors and ground. UVs are computed in the shader from the world position
 * (box / "triplanar-lite" projection: the face's dominant world axis picks the plane), so a
 * texture keeps its real-world scale on any Block size — batched instances need no UVs.
 * The object's `color` tints the texture (like paint), so neutral textures stay reusable.
 */
export type Surface =
  | 'plaster'
  | 'brick'
  | 'tiles'
  | 'concrete'
  | 'pavers'
  | 'asphalt'
  | 'soil'
  | 'grass'
  | 'woodFloor'
  | 'woodFloorLight'
  | 'carpetNavy'
  | 'carpetBeige'

interface SurfaceDef {
  /** Meters covered by one texture repeat. */
  tile: number
  roughness: number
  /**
   * Use the normal map. Only on rough outdoor surfaces: on the dev laptop's Intel UHD, normal
   * maps on the big interior floors/walls cost ~8 fps for detail you barely see there.
   */
  normal?: boolean
  normalScale?: number
  /** Brightness multiplier on the tint: textures average ~50 % grey, so light paint needs > 1. */
  gain?: number
  /** Blend in a rotated second sample + low-frequency brightness noise to hide repetition. */
  antiTile?: boolean
}

export const SURFACES: Record<Surface, SurfaceDef> = {
  plaster: { tile: 2.5, roughness: 0.92, gain: 1.3 },
  brick: { tile: 1.6, roughness: 0.9, normal: true },
  tiles: { tile: 2.4, roughness: 0.35, gain: 1.2 },
  concrete: { tile: 3, roughness: 0.85, gain: 1.4 },
  pavers: { tile: 2, roughness: 0.85, normal: true, gain: 1.8 },
  asphalt: { tile: 4, roughness: 0.95, normal: true, antiTile: true, gain: 1.3 },
  soil: { tile: 2.5, roughness: 1, normal: true, antiTile: true },
  grass: { tile: 3, roughness: 1, normal: true, normalScale: 0.6, antiTile: true },
  woodFloor: { tile: 2.2, roughness: 0.55 },
  woodFloorLight: { tile: 2.2, roughness: 0.5 },
  carpetNavy: { tile: 1.5, roughness: 1 },
  carpetBeige: { tile: 1.5, roughness: 1 },
}

const loader = new TextureLoader()
const textures = new Map<string, Texture>()

function texture(surface: Surface, map: 'color' | 'normal') {
  const key = `${surface}/${map}`
  let t = textures.get(key)
  if (!t) {
    // Not suspending: the material renders untextured for the few frames until it arrives.
    t = loader.load(`/textures/${key}.webp`)
    t.wrapS = t.wrapT = RepeatWrapping
    t.anisotropy = 4
    if (map === 'color') t.colorSpace = SRGBColorSpace
    textures.set(key, t)
  }
  return t
}

const VERTEX = /* glsl */ `
#include <project_vertex>
{
  vec4 tpWorld = vec4(transformed, 1.0);
  vec3 tpNormal = objectNormal;
  #ifdef USE_INSTANCING
    tpWorld = instanceMatrix * tpWorld;
    tpNormal = mat3(instanceMatrix) * tpNormal;
  #endif
  tpWorld = modelMatrix * tpWorld;
  tpNormal = abs(normalize(mat3(modelMatrix) * tpNormal));
  vec2 tpUv = tpNormal.y > max(tpNormal.x, tpNormal.z) ? tpWorld.xz
    : (tpNormal.x > tpNormal.z ? tpWorld.zy : tpWorld.xy);
  tpUv /= uTile;
  vMapUv = tpUv;
  #ifdef USE_NORMALMAP
    vNormalMapUv = tpUv;
  #endif
}
`

const ANTI_TILE = /* glsl */ `
float tpHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float tpNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(tpHash(i), tpHash(i + vec2(1, 0)), f.x), mix(tpHash(i + vec2(0, 1)), tpHash(i + vec2(1, 1)), f.x), f.y);
}
`

const MAP_FRAGMENT = /* glsl */ `
#ifdef USE_MAP
  vec4 sampledDiffuseColor = texture2D(map, vMapUv);
  #ifdef TP_ANTI_TILE
    vec2 tpUv2 = mat2(0.8, -0.6, 0.6, 0.8) * vMapUv * 0.71 + 0.37;
    sampledDiffuseColor = mix(sampledDiffuseColor, texture2D(map, tpUv2), smoothstep(0.3, 0.7, tpNoise(vMapUv * 0.23)));
    sampledDiffuseColor.rgb *= 0.86 + 0.28 * tpNoise(vMapUv * 0.05 + 11.0);
  #endif
  diffuseColor *= sampledDiffuseColor;
#endif
`

const materials = new Map<string, MeshStandardMaterial>()

/** Shared material for a surface + tint (one per pair, so the batch can group by it). */
export function surfaceMaterial(surface: Surface, color = '#ffffff') {
  const key = `${surface}|${color}`
  let m = materials.get(key)
  if (m) return m
  const def = SURFACES[surface]
  m = new MeshStandardMaterial({
    color,
    map: texture(surface, 'color'),
    normalMap: def.normal ? texture(surface, 'normal') : null,
    normalScale: new Vector2(def.normalScale ?? 1, def.normalScale ?? 1),
    roughness: def.roughness,
    metalness: 0,
  })
  m.color.multiplyScalar(def.gain ?? 1)
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTile = { value: def.tile }
    shader.vertexShader = `uniform float uTile;\n${shader.vertexShader}`.replace('#include <project_vertex>', VERTEX)
    shader.fragmentShader = (def.antiTile ? `#define TP_ANTI_TILE\n${ANTI_TILE}` : '') + shader.fragmentShader.replace('#include <map_fragment>', MAP_FRAGMENT)
  }
  m.customProgramCacheKey = () => `surface|${def.antiTile ? 1 : 0}`
  materials.set(key, m)
  return m
}
