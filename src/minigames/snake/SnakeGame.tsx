import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameProps } from '../registry'

const GRID = 20
const CELL = 20
const SIZE = GRID * CELL
const START_SPEED_MS = 140
const MIN_SPEED_MS = 60
const SPEEDUP_MS = 4
const POINTS_PER_APPLE = 10

type Point = { x: number; y: number }
type Dir = Point

const DIRS: Record<string, Dir> = {
  ArrowUp: { x: 0, y: -1 }, KeyW: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 }, KeyS: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 }, KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }, KeyD: { x: 1, y: 0 },
}

type Phase = 'ready' | 'playing' | 'paused' | 'over'

function randomFood(snake: Point[]): Point {
  while (true) {
    const p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }
    if (!snake.some((s) => s.x === p.x && s.y === p.y)) return p
  }
}

function initialState() {
  const snake = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }]
  return { snake, dir: { x: 1, y: 0 }, queue: [] as Dir[], food: randomFood(snake), score: 0, speed: START_SPEED_MS }
}

/** Classic snake on a 20×20 grid; walls and your own tail end the run. */
export default function SnakeGame({ onGameOver }: GameProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const game = useRef(initialState())
  const [phase, setPhase] = useState<Phase>('ready')
  const [score, setScore] = useState(0)
  const phaseRef = useRef<Phase>('ready')
  phaseRef.current = phase
  const onGameOverRef = useRef(onGameOver)
  onGameOverRef.current = onGameOver

  const draw = useCallback(() => {
    const ctx = canvas.current?.getContext('2d')
    if (!ctx) return
    const { snake, food } = game.current
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, SIZE, SIZE)
    ctx.fillStyle = '#1e293b'
    for (let x = 0; x < GRID; x++) for (let y = (x % 2); y < GRID; y += 2) ctx.fillRect(x * CELL, y * CELL, CELL, CELL)
    // apple
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL * 0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#22c55e'
    ctx.fillRect(food.x * CELL + CELL / 2 - 1, food.y * CELL + 2, 3, 5)
    // snake
    snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? '#4ade80' : `hsl(142, 70%, ${45 - Math.min(i, 20)}%)`
      ctx.beginPath()
      ctx.roundRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, 5)
      ctx.fill()
    })
    const head = snake[0]
    const { dir } = game.current
    ctx.fillStyle = '#0f172a'
    for (const side of [-1, 1]) {
      const ex = head.x * CELL + CELL / 2 + dir.x * 4 + dir.y * side * 4
      const ey = head.y * CELL + CELL / 2 + dir.y * 4 + dir.x * side * 4
      ctx.beginPath()
      ctx.arc(ex, ey, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [])

  // Game loop: one step per `speed` ms while playing.
  useEffect(() => {
    if (phase !== 'playing') return
    let timer = 0
    const step = () => {
      const g = game.current
      const next = g.queue.shift()
      if (next) g.dir = next
      const head = { x: g.snake[0].x + g.dir.x, y: g.snake[0].y + g.dir.y }
      const ate = head.x === g.food.x && head.y === g.food.y
      const body = ate ? g.snake : g.snake.slice(0, -1)
      const hitWall = head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID
      const hitSelf = body.some((s) => s.x === head.x && s.y === head.y)
      if (hitWall || hitSelf) {
        setPhase('over')
        onGameOverRef.current(g.score)
        return
      }
      g.snake = [head, ...body]
      if (ate) {
        g.score += POINTS_PER_APPLE
        g.speed = Math.max(MIN_SPEED_MS, g.speed - SPEEDUP_MS)
        g.food = randomFood(g.snake)
        setScore(g.score)
      }
      draw()
      timer = window.setTimeout(step, g.speed)
    }
    timer = window.setTimeout(step, game.current.speed)
    return () => window.clearTimeout(timer)
  }, [phase, draw])

  const turn = useCallback((d: Dir) => {
    const g = game.current
    const last = g.queue[g.queue.length - 1] ?? g.dir
    const reversing = d.x === -last.x && d.y === -last.y
    if (phaseRef.current === 'ready' && !reversing) setPhase('playing')
    // Ignore reversing into yourself and repeated presses; buffer at most two turns.
    if (reversing || (d.x === last.x && d.y === last.y) || g.queue.length >= 2) return
    g.queue.push(d)
  }, [])

  const togglePause = useCallback(() => {
    setPhase((p) => (p === 'playing' ? 'paused' : p === 'paused' ? 'playing' : p))
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const d = DIRS[e.code]
      if (d) {
        e.preventDefault()
        if (phaseRef.current === 'paused') setPhase('playing')
        if (phaseRef.current !== 'over') turn(d)
      } else if (e.code === 'Space' || e.code === 'KeyP') {
        e.preventDefault()
        togglePause()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [turn, togglePause])

  // Pause automatically when the tab is hidden.
  useEffect(() => {
    const onHide = () => document.hidden && setPhase((p) => (p === 'playing' ? 'paused' : p))
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [])

  useEffect(draw, [draw])

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full max-w-[400px] items-center justify-between text-sm">
        <span className="font-semibold">Score: {score}</span>
        <button type="button" onClick={togglePause} disabled={phase === 'ready' || phase === 'over'}
          className="rounded-md border border-slate-300 px-2 py-0.5 text-xs disabled:opacity-40">
          {phase === 'paused' ? 'Resume' : 'Pause'}
        </button>
      </div>
      <div className="relative w-full max-w-[400px]">
        <canvas ref={canvas} width={SIZE} height={SIZE} className="block aspect-square w-full rounded-lg" aria-label="Snake board" />
        {(phase === 'ready' || phase === 'paused') && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-slate-950/60 text-center text-white">
            <p className="text-lg font-semibold">{phase === 'ready' ? 'Press an arrow key to start' : 'Paused'}</p>
          </div>
        )}
      </div>
      {/* On-screen D-pad for touch / mouse */}
      <div className="grid grid-cols-3 gap-1" aria-label="Direction buttons">
        {([['', null], ['↑', DIRS.ArrowUp], ['', null], ['←', DIRS.ArrowLeft], ['↓', DIRS.ArrowDown], ['→', DIRS.ArrowRight]] as const).map(([label, d], i) =>
          d ? (
            <button key={i} type="button" onClick={() => turn(d)} aria-label={`Move ${label}`}
              className="size-10 rounded-lg bg-slate-100 text-lg font-bold hover:bg-slate-200">{label}</button>
          ) : (
            <span key={i} />
          ),
        )}
      </div>
    </div>
  )
}
