import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../store/useGameStore'
import { sportRuntime, useSportStore } from '../../minigames/sports/sportStore'
import { SPORTS } from '../../minigames/sports/config'

const MESSAGE_MS = 1300

/** Scoreboard, countdown, aim/power meters and results for the outdoor sports. */
export function SportHud() {
  const active = useSportStore((s) => s.active)
  const phase = useSportStore((s) => s.phase)
  const score = useSportStore((s) => s.score)
  const timeLeft = useSportStore((s) => s.timeLeft)
  const countdown = useSportStore((s) => s.countdown)
  const stat = useSportStore((s) => s.stat)
  if (!active) return null
  const spec = SPORTS[active]

  return (
    <>
      <div className="absolute top-3 left-1/2 flex -translate-x-1/2 items-center gap-5 rounded-2xl bg-slate-900/85 px-5 py-2 text-white shadow-lg ring-1 ring-white/15 backdrop-blur">
        <div className="text-sm font-semibold text-sky-300">{spec.title}</div>
        <div className="text-center">
          <div className="text-[10px] tracking-wider text-slate-400 uppercase">{spec.scoreLabel}</div>
          <div className="text-2xl leading-none font-extrabold tabular-nums">{score}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] tracking-wider text-slate-400 uppercase">Time</div>
          <div className={`text-2xl leading-none font-extrabold tabular-nums ${phase === 'playing' && timeLeft < 10 ? 'text-rose-400' : ''}`}>
            {Math.ceil(phase === 'countdown' ? spec.duration : timeLeft)}
          </div>
        </div>
        {stat && <div className="text-xs text-slate-300">{stat}</div>}
      </div>

      {phase === 'countdown' && (
        <div key={countdown} className="absolute inset-0 flex items-center justify-center">
          <span className="text-8xl font-black text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] animate-[prompt-in_300ms_ease-out]">
            {countdown}
          </span>
        </div>
      )}

      {phase !== 'over' && <Flash />}
      {phase === 'playing' && <Meters />}
      {phase === 'over' && <Results />}
    </>
  )
}

function Flash() {
  const message = useSportStore((s) => s.message)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!message) return
    setVisible(true)
    const id = window.setTimeout(() => setVisible(false), MESSAGE_MS)
    return () => window.clearTimeout(id)
  }, [message])
  if (!message || !visible) return null
  const color = message.tone === 'great' ? 'text-amber-300' : message.tone === 'good' ? 'text-emerald-300' : 'text-rose-300'
  return (
    <div className="absolute inset-x-0 top-[30%] flex justify-center" role="status">
      <span key={message.key} className={`text-6xl font-black ${color} drop-shadow-[0_4px_12px_rgba(0,0,0,0.7)] animate-[prompt-in_200ms_ease-out]`}>
        {message.text}
      </span>
    </div>
  )
}

/** Aim and power bars, driven every animation frame from sportRuntime (no React re-renders). */
function Meters() {
  const aimRow = useRef<HTMLDivElement>(null)
  const aimMarker = useRef<HTMLDivElement>(null)
  const aimZone = useRef<HTMLDivElement>(null)
  const powerRow = useRef<HTMLDivElement>(null)
  const powerFill = useRef<HTMLDivElement>(null)
  const powerZone = useRef<HTMLDivElement>(null)
  const prompt = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const r = sportRuntime
      const showAim = r.stage === 'aim'
      const showPower = r.stage === 'power'
      if (aimRow.current) aimRow.current.style.opacity = showAim ? '1' : '0.35'
      if (powerRow.current) powerRow.current.style.opacity = showPower ? '1' : '0.35'
      if (aimMarker.current) aimMarker.current.style.left = `${((r.aim + 1) / 2) * 100}%`
      if (aimZone.current) {
        aimZone.current.style.display = r.aimZone ? 'block' : 'none'
        if (r.aimZone) {
          aimZone.current.style.left = `${((r.aimZone[0] + 1) / 2) * 100}%`
          aimZone.current.style.width = `${((r.aimZone[1] - r.aimZone[0]) / 2) * 100}%`
        }
      }
      if (powerFill.current) powerFill.current.style.width = `${r.power * 100}%`
      if (powerZone.current) {
        powerZone.current.style.display = r.powerZone ? 'block' : 'none'
        if (r.powerZone) {
          powerZone.current.style.left = `${r.powerZone[0] * 100}%`
          powerZone.current.style.width = `${(r.powerZone[1] - r.powerZone[0]) * 100}%`
        }
      }
      if (prompt.current) prompt.current.textContent = r.prompt
      const hasMeters = r.stage === 'aim' || r.stage === 'power'
      if (aimRow.current?.parentElement) aimRow.current.parentElement.style.visibility = hasMeters ? 'visible' : 'hidden'
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="absolute inset-x-0 bottom-20 flex flex-col items-center gap-2">
      <div ref={prompt} className="text-lg font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]" />
      <div className="w-80 space-y-2 rounded-xl bg-slate-900/80 p-3 text-xs text-slate-300 ring-1 ring-white/15 backdrop-blur">
        <div ref={aimRow} className="transition-opacity">
          <div className="mb-1">Aim</div>
          <div className="relative h-3 rounded-full bg-slate-700">
            <div ref={aimZone} className="absolute inset-y-0 rounded-full bg-emerald-500/60" />
            <div className="absolute inset-y-0 left-1/2 w-px bg-white/50" />
            <div ref={aimMarker} className="absolute -top-1 h-5 w-1.5 -translate-x-1/2 rounded bg-amber-300 shadow" />
          </div>
        </div>
        <div ref={powerRow} className="transition-opacity">
          <div className="mb-1">Power</div>
          <div className="relative h-3 overflow-hidden rounded-full bg-slate-700">
            <div ref={powerZone} className="absolute inset-y-0 bg-emerald-500/50" />
            <div ref={powerFill} className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-400 to-rose-500 opacity-90" />
          </div>
        </div>
      </div>
    </div>
  )
}

function Results() {
  const active = useSportStore((s) => s.active)!
  const result = useSportStore((s) => s.result)
  const restart = useSportStore((s) => s.restart)
  const exitFocus = useGameStore((s) => s.exitFocus)
  const isGuest = useGameStore((s) => s.user === null)
  const spec = SPORTS[active]

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40">
      <div className="pointer-events-auto w-80 rounded-2xl bg-white p-6 text-center text-slate-900 shadow-2xl animate-[prompt-in_200ms_ease-out]" role="dialog" aria-label="Round results">
        <p className="text-sm font-semibold text-slate-500">Time&apos;s up!</p>
        {result?.isNewBest && <p className="mt-1 text-sm font-bold tracking-wide text-amber-600 uppercase">New high score!</p>}
        <p className="text-5xl font-extrabold">{result?.score ?? '…'}</p>
        <p className="text-sm text-slate-600">{spec.scoreLabel}</p>
        {result && <p className="mt-1 text-sm text-slate-600">Your best: {result.best}</p>}
        {isGuest && <p className="mt-1 text-xs text-slate-500">Log in at the gate to save scores to your account.</p>}
        <div className="mt-5 flex justify-center gap-2">
          <button type="button" onClick={restart} autoFocus className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500">
            Play again
          </button>
          <button type="button" onClick={exitFocus} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
            Leave
          </button>
        </div>
      </div>
    </div>
  )
}
