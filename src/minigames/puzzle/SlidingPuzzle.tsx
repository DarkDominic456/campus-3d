import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameProps } from '../registry'

type Size = 3 | 4
const BOARD_PX = 360
const BASE_SCORE: Record<Size, number> = { 3: 1000, 4: 2000 }
const MOVE_PENALTY = 4
const SECOND_PENALTY = 3
const MIN_SCORE = 50

const solved = (n: Size) => [...Array.from({ length: n * n - 1 }, (_, i) => i + 1), 0]

/** Neighbours of cell i on an n×n board. */
function neighbours(i: number, n: number) {
  const r = Math.floor(i / n)
  const c = i % n
  const list: number[] = []
  if (r > 0) list.push(i - n)
  if (r < n - 1) list.push(i + n)
  if (c > 0) list.push(i - 1)
  if (c < n - 1) list.push(i + 1)
  return list
}

/** Shuffle by random legal moves from the solved board, so it is always solvable. */
function shuffled(n: Size): number[] {
  const tiles = solved(n)
  let blank = tiles.length - 1
  let previous = -1
  for (let k = 0; k < n * n * 25; k++) {
    const options = neighbours(blank, n).filter((i) => i !== previous)
    const pick = options[Math.floor(Math.random() * options.length)]
    ;[tiles[blank], tiles[pick]] = [tiles[pick], tiles[blank]]
    previous = blank
    blank = pick
  }
  return tiles.join() === solved(n).join() ? shuffled(n) : tiles
}

/** Sliding tile puzzle (8- or 15-puzzle). Score rewards few moves and a quick solve. */
export default function SlidingPuzzle({ onGameOver }: GameProps) {
  const [size, setSize] = useState<Size>(3)
  const [tiles, setTiles] = useState(() => shuffled(3))
  const [moves, setMoves] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  const [done, setDone] = useState(false)
  const onGameOverRef = useRef(onGameOver)
  onGameOverRef.current = onGameOver

  const seconds = startedAt ? Math.floor((now - startedAt) / 1000) : 0

  useEffect(() => {
    if (!startedAt || done) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [startedAt, done])

  const restart = (n: Size) => {
    setSize(n)
    setTiles(shuffled(n))
    setMoves(0)
    setStartedAt(null)
    setDone(false)
  }

  const moveTile = useCallback(
    (index: number) => {
      if (done) return
      const blank = tiles.indexOf(0)
      if (!neighbours(blank, size).includes(index)) return
      const next = [...tiles]
      ;[next[blank], next[index]] = [next[index], next[blank]]
      const start = startedAt ?? Date.now()
      if (!startedAt) setStartedAt(start)
      setTiles(next)
      setMoves((m) => m + 1)
      if (next.join() === solved(size).join()) {
        const elapsed = Math.floor((Date.now() - start) / 1000)
        setNow(Date.now())
        setDone(true)
        const score = Math.max(MIN_SCORE, BASE_SCORE[size] - (moves + 1) * MOVE_PENALTY - elapsed * SECOND_PENALTY)
        onGameOverRef.current(score)
      }
    },
    [done, tiles, size, startedAt, moves],
  )

  // Arrow keys slide the tile next to the blank *into* it (Up moves the tile below upward).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const blank = tiles.indexOf(0)
      const r = Math.floor(blank / size)
      const c = blank % size
      const target: Record<string, number | null> = {
        ArrowUp: r < size - 1 ? blank + size : null,
        ArrowDown: r > 0 ? blank - size : null,
        ArrowLeft: c < size - 1 ? blank + 1 : null,
        ArrowRight: c > 0 ? blank - 1 : null,
      }
      if (!(e.code in target)) return
      e.preventDefault()
      const t = target[e.code]
      if (t !== null) moveTile(t)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tiles, size, moveTile])

  const tilePx = BOARD_PX / size

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full max-w-[360px] items-center justify-between text-sm">
        <span className="font-semibold">Moves: {moves}</span>
        <span className="font-semibold">Time: {seconds}s</span>
        <div className="flex gap-1">
          {([3, 4] as Size[]).map((n) => (
            <button key={n} type="button" onClick={() => restart(n)}
              className={`rounded-md border px-2 py-0.5 text-xs ${size === n ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-300'}`}>
              {n}×{n}
            </button>
          ))}
        </div>
      </div>
      <div
        className="relative rounded-xl bg-slate-800 p-1"
        style={{ width: BOARD_PX + 8, height: BOARD_PX + 8 }}
        role="grid"
        aria-label={`${size} by ${size} sliding puzzle`}
      >
        {tiles.map((value, index) =>
          value === 0 ? null : (
            <button
              key={value}
              type="button"
              onClick={() => moveTile(index)}
              aria-label={`Tile ${value}`}
              className="absolute flex items-center justify-center rounded-lg text-2xl font-extrabold text-white shadow-md transition-[left,top] duration-150 ease-out"
              style={{
                width: tilePx - 6,
                height: tilePx - 6,
                left: 4 + (index % size) * tilePx + 3,
                top: 4 + Math.floor(index / size) * tilePx + 3,
                background: `hsl(${(value - 1) * (300 / (size * size - 1))}, 70%, 52%)`,
              }}
            >
              {value}
            </button>
          ),
        )}
      </div>
      <p className="text-xs text-slate-500">
        {done ? `Solved in ${moves} moves and ${seconds}s!` : 'Order the tiles 1 → ' + (size * size - 1) + ', blank space last.'}
      </p>
    </div>
  )
}
