import { useGLTF } from '@react-three/drei'
import { ANIMATIONS_URL, CHARACTERS, FURNITURE, NATURE, characterUrl, propUrl } from './models'

/** Start fetching every model up front (all files together are ~1.6 MB). 3D mode only. */
export function preloadModels() {
  for (const name of [...FURNITURE, ...NATURE]) useGLTF.preload(propUrl(name))
  for (const variant of CHARACTERS) useGLTF.preload(characterUrl(variant))
  useGLTF.preload(ANIMATIONS_URL)
}
