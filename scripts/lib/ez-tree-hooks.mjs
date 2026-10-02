/**
 * Node module hooks so EZ-Tree's browser-oriented source (src/lib) runs in the asset pipeline:
 * extensionless relative imports get `.js`, JSON presets load as modules, and image imports
 * (textures — we export our own) become their file path.
 */
export async function resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
    try {
      return await next(`${specifier}.js`, context)
    } catch {
      return next(`${specifier}/index.js`, context)
    }
  }
  return next(specifier, context)
}

export async function load(url, context, next) {
  // textures.js loads every texture with THREE.TextureLoader at import time (needs a DOM).
  if (url.endsWith('/ez-tree/src/lib/textures.js')) {
    return { format: 'module', shortCircuit: true, source: 'export const getBarkTexture = () => null\nexport const getLeafTexture = () => null' }
  }
  if (url.endsWith('.json')) return next(url, { ...context, importAttributes: { type: 'json' } })
  if (/\.(jpe?g|png|webp)$/i.test(url)) {
    return { format: 'module', shortCircuit: true, source: `export default ${JSON.stringify(new URL(url).pathname)}` }
  }
  return next(url, context)
}
