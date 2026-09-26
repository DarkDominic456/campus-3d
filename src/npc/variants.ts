import { CHARACTERS, type CharacterVariant } from '../assets/models'

/** Deterministic variety: the same NPC slot always gets the same look and loop phase. */
export function npcLook(index: number, salt = 0): { variant: CharacterVariant; phase: number } {
  const h = Math.abs(Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453)
  const frac = h - Math.floor(h)
  // Skip 'male-a' (the default player avatar) so NPCs don't look like the player.
  const pool = CHARACTERS.filter((v) => v !== 'male-a')
  return { variant: pool[Math.floor(frac * pool.length) % pool.length], phase: frac }
}
