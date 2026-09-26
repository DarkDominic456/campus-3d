import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from '../registry'
import { PICTURES, type Picture } from './pictures'

const BASE_SCORE = 1000
const SECOND_PENALTY = 2
const MISTAKE_PENALTY = 15
const MIN_SCORE = 100
const CELL_PX = 30

/** Paint every numbered cell with the matching colour to reveal the picture. */
export default function PaintByNumbers({ onGameOver }: GameProps) {
  const [picture, setPicture] = useState<Picture>(PICTURES[0])
  return <Board key={picture.id} picture={picture} onPick={setPicture} onGameOver={onGameOver} />
}

function Board({ picture, onPick, onGameOver }: { picture: Picture; onPick: (p: Picture) => void } & GameProps) {
  const target = useMemo(() => picture.rows.flatMap((row) => [...row].map(Number)), [picture])
  const width = picture.rows[0].length
  const [painted, setPainted] = useState<(number | null)[]>(() => target.map(() => null))
  const [color, setColor] = useState(1)
  const [mistakes, setMistakes] = useState(0)
  const [showHint, setShowHint] = useState(true)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [done, setDone] = useState(false)
  const dragging = useRef(false)
  const onGameOverRef = useRef(onGameOver)
  onGameOverRef.current = onGameOver

  const correct = painted.filter((p, i) => p === target[i]).length

  const paint = (i: number) => {
    if (done || painted[i] === color) return
    if (!startedAt) setStartedAt(Date.now())
    if (color !== target[i]) setMistakes((m) => m + 1)
    setPainted((prev) => {
      const next = [...prev]
      next[i] = color
      return next
    })
  }

  // Finish once every cell matches.
  useEffect(() => {
    if (done || correct !== target.length) return
    setDone(true)
    const seconds = Math.floor((Date.now() - (startedAt ?? Date.now())) / 1000)
    onGameOverRef.current(Math.max(MIN_SCORE, BASE_SCORE - seconds * SECOND_PENALTY - mistakes * MISTAKE_PENALTY))
  }, [correct, target.length, done, startedAt, mistakes])

  // Number keys pick colours.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (n >= 1 && n <= picture.palette.length) setColor(n)
    }
    const stop = () => (dragging.current = false)
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerup', stop)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerup', stop)
    }
  }, [picture.palette.length])

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full max-w-[400px] items-center justify-between text-sm">
        <div className="flex gap-1">
          {PICTURES.map((p) => (
            <button key={p.id} type="button" onClick={() => onPick(p)}
              className={`rounded-md border px-2 py-0.5 text-xs ${p.id === picture.id ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-300'}`}>
              {p.name}
            </button>
          ))}
        </div>
        <span className="font-semibold">Mistakes: {mistakes}</span>
      </div>

      <div
        className="grid touch-none gap-px rounded-lg bg-slate-300 p-px select-none"
        style={{ gridTemplateColumns: `repeat(${width}, ${CELL_PX}px)` }}
        onPointerLeave={() => (dragging.current = false)}
        // Hit-test under the pointer instead of pointerenter: touch input captures the pointer
        // to the first cell, so enter events never fire on the others.
        onPointerMove={(e) => {
          if (!dragging.current) return
          const cell = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>('[data-cell]')
          if (cell) paint(Number(cell.dataset.cell))
        }}
        role="grid"
        aria-label={`${picture.name} paint-by-numbers grid`}
      >
        {target.map((n, i) => {
          const p = painted[i]
          const wrong = p !== null && p !== n
          const highlight = showHint && p !== n && n === color
          return (
            <div
              key={i}
              data-cell={i}
              role="gridcell"
              aria-label={`Cell ${i + 1}, colour ${n}${p ? `, painted ${p}` : ''}`}
              onPointerDown={(e) => {
                e.preventDefault()
                const el = e.target as Element
                if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
                dragging.current = true
                paint(i)
              }}
              className="flex items-center justify-center text-[11px] font-semibold"
              style={{
                width: CELL_PX,
                height: CELL_PX,
                background: p ? picture.palette[p - 1] : highlight ? '#fef9c3' : '#ffffff',
                color: wrong ? '#dc2626' : '#94a3b8',
                cursor: 'crosshair',
              }}
            >
              {(p === null || wrong) && n}
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2" role="radiogroup" aria-label="Colours">
        {picture.palette.map((c, i) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={color === i + 1}
            aria-label={`Colour ${i + 1}`}
            onClick={() => setColor(i + 1)}
            className={`flex size-10 items-center justify-center rounded-full text-sm font-bold shadow ring-offset-2 ${color === i + 1 ? 'ring-2 ring-slate-900' : ''}`}
            style={{ background: c, color: '#0f172a' }}
          >
            {i + 1}
          </button>
        ))}
        <label className="ml-2 flex items-center gap-1 text-xs text-slate-600">
          <input type="checkbox" checked={showHint} onChange={(e) => setShowHint(e.target.checked)} />
          Highlight cells
        </label>
      </div>

      <div className="h-1.5 w-full max-w-[400px] overflow-hidden rounded-full bg-slate-200" aria-label="Progress">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(correct / target.length) * 100}%` }} />
      </div>
    </div>
  )
}
