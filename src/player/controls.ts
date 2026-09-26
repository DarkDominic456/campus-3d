import type { KeyboardControlsEntry } from '@react-three/drei'

export const Controls = {
  forward: 'forward',
  back: 'back',
  left: 'left',
  right: 'right',
  run: 'run',
  jump: 'jump',
} as const

export type ControlName = (typeof Controls)[keyof typeof Controls]

export const keyMap: KeyboardControlsEntry<ControlName>[] = [
  { name: Controls.forward, keys: ['KeyW', 'ArrowUp'] },
  { name: Controls.back, keys: ['KeyS', 'ArrowDown'] },
  { name: Controls.left, keys: ['KeyA', 'ArrowLeft'] },
  { name: Controls.right, keys: ['KeyD', 'ArrowRight'] },
  { name: Controls.run, keys: ['ShiftLeft', 'ShiftRight'] },
  { name: Controls.jump, keys: ['Space'] },
]

/**
 * Extra movement input from non-keyboard sources (the Phase 7 virtual joystick).
 * x = right, y = forward, both in [-1, 1]. Merged with keyboard input in Player.
 */
export const externalInput = {
  move: { x: 0, y: 0 },
  run: false,
  jump: false,
}
