import { useGLTF } from '@react-three/drei'
import { ANIMATION_URLS, CHARACTERS, FURNITURE, NATURE, POLYHAVEN, TREES, characterUrl, propUrl } from './models'

/** Start fetching every model up front (all files together are ~3 MB). 3D mode only. */
export function preloadModels() {
  for (const name of [...FURNITURE, ...NATURE, ...POLYHAVEN, ...TREES]) useGLTF.preload(propUrl(name))
  for (const variant of CHARACTERS) useGLTF.preload(characterUrl(variant))
  for (const url of ANIMATION_URLS) useGLTF.preload(url)
}
