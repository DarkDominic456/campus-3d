import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

export type GameId = 'snake' | 'puzzle' | 'paint'

/** Every mini game receives this; call onGameOver exactly once per run. */
export interface GameProps {
  onGameOver: (score: number) => void
}

export interface GameMeta {
  id: GameId
  title: string
  description: string
  controls: string
  color: string
  /** Code-split: each game loads only when first played. */
  component: LazyExoticComponent<ComponentType<GameProps>>
}

export const GAMES: GameMeta[] = [
  {
    id: 'snake',
    title: 'Snake',
    description: 'Eat the apples, grow longer, don’t bite yourself. Speeds up as you go.',
    controls: 'Arrow keys / WASD · Space to pause',
    color: '#2563eb',
    component: lazy(() => import('./snake/SnakeGame')),
  },
  {
    id: 'puzzle',
    title: 'Sliding Puzzle',
    description: 'Slide the tiles back into order. Fewer moves and less time score more.',
    controls: 'Click a tile or use arrow keys',
    color: '#e11d48',
    component: lazy(() => import('./puzzle/SlidingPuzzle')),
  },
  {
    id: 'paint',
    title: 'Paint by Numbers',
    description: 'Pick a colour, paint every cell with its number and reveal the picture.',
    controls: 'Click / drag to paint · 1–9 to pick a colour',
    color: '#059669',
    component: lazy(() => import('./paint/PaintByNumbers')),
  },
]

export const gameMeta = (id: GameId) => GAMES.find((g) => g.id === id)!
