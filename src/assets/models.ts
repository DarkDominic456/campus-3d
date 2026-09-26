/**
 * Every GLB the app loads (pure data — no three.js imports, so the 2D site can use it). Files are produced by `npm run assets` (scripts/build-assets.mjs)
 * from the CC0 sources in assets-src/. Props have a bottom-center pivot and face +Z.
 */
export const FURNITURE = [
  'bench', 'bookcaseClosedWide', 'bookcaseOpen', 'books', 'cabinetTelevision', 'chair', 'chairCushion',
  'chairDesk', 'coatRackStanding', 'computerKeyboard', 'computerScreen', 'desk', 'lampSquareFloor',
  'laptop', 'loungeChair', 'loungeDesignSofa', 'loungeSofa', 'plantSmall1', 'pottedPlant', 'rugRectangle',
  'rugRound', 'sideTable', 'speaker', 'table', 'tableCoffee', 'televisionModern',
] as const
export const NATURE = [
  'flower_redA', 'flower_yellowA', 'plant_bush', 'plant_bushLarge', 'tree_default', 'tree_detailed',
  'tree_fat', 'tree_oak', 'tree_pineRoundA',
] as const
export const CHARACTERS = [
  'male-a', 'male-b', 'male-c', 'male-d', 'male-e', 'male-f',
  'female-a', 'female-b', 'female-c', 'female-d', 'female-e', 'female-f',
] as const

export type FurnitureName = (typeof FURNITURE)[number]
export type NatureName = (typeof NATURE)[number]
export type PropName = FurnitureName | NatureName
export type CharacterVariant = (typeof CHARACTERS)[number]

/** Kenney furniture is ~half real size; ×2 makes a desk ≈ 0.77 m tall. */
export const FURNITURE_SCALE = 2
/** Kenney nature trees are ~1.5 units tall. */
export const NATURE_SCALE = 3.5
/** Mini characters are 0.67 units tall; ×2.5 ≈ 1.7 m, matching the player capsule. */
export const CHARACTER_SCALE = 2.5

const isNature = (name: PropName): name is NatureName => (NATURE as readonly string[]).includes(name)

export const propUrl = (name: PropName) => `/models/${isNature(name) ? 'nature' : 'furniture'}/${name}.glb`
export const propScale = (name: PropName) => (isNature(name) ? NATURE_SCALE : FURNITURE_SCALE)
export const characterUrl = (variant: CharacterVariant) => `/models/characters/${variant}.glb`
export const ANIMATIONS_URL = '/models/characters/animations.glb'
