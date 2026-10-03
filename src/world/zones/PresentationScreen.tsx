import { useState } from 'react'
import { Html } from '@react-three/drei'
import type { Vector3Tuple } from 'three'
import { SlideDeck } from '../../ui/slides/SlideDeck'
import { useGameStore } from '../../store/useGameStore'
import { liveSession, safeLink, schedule, useNow, videoEmbed, whenLabel, type Occurrence } from '../../sessions/schedule'
import { SessionVideo } from '../../ui/sessions/SessionsContent'

export const PRESENTATION_FOCUS_ID = 'conference-screen'

/** Screen size in meters and the HTML size in CSS px; distanceFactor maps px → m (px × f/400). */
const SCREEN = { width: 4.6, height: 2.5 }
const PX = { width: 920, height: 500 }
const DISTANCE_FACTOR = (SCREEN.width / PX.width) * 400

/**
 * The conference room screen: HTML rendered on the 3D surface via drei <Html transform> —
 * the live session (video or a join card) while one is on, otherwise the slides.
 * Only mounted while the player is in the room (HTML draws above the canvas, so it would
 * otherwise show through walls). Arrow keys / buttons navigate while focused.
 */
export function PresentationScreen({ position, rotationY }: { position: Vector3Tuple; rotationY: number }) {
  const inRoom = useGameStore((s) => s.currentZone === 'conference')
  const focused = useGameStore((s) => s.focus?.id === PRESENTATION_FOCUS_ID)

  return (
    <group position={position} rotation-y={rotationY}>
      {/* Physical screen, always visible */}
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[SCREEN.width + 0.12, SCREEN.height + 0.12, 0.04]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      {(inRoom || focused) && (
        <Html
          transform
          distanceFactor={DISTANCE_FACTOR}
          zIndexRange={[5, 0]}
          style={{ width: PX.width, height: PX.height, pointerEvents: focused ? 'auto' : 'none' }}
        >
          <ScreenContent focused={focused} />
        </Html>
      )}
    </group>
  )
}

function ScreenContent({ focused }: { focused: boolean }) {
  const now = useNow(15_000)
  const live = liveSession(now)
  const next = live ? null : (schedule(now)[0] ?? null)
  const [showSlides, setShowSlides] = useState(false)
  if (live && !showSlides) return <LiveScreen o={live} now={now} focused={focused} onSlides={() => setShowSlides(true)} />
  return (
    <div className="relative h-full w-full">
      <SlideDeck keyboard={focused} />
      {live ? (
        <button
          type="button"
          onClick={() => setShowSlides(false)}
          className="absolute top-3 right-3 flex items-center gap-2 rounded-full bg-rose-600 px-3 py-1 text-sm font-semibold text-white"
        >
          <span className="size-2 animate-pulse rounded-full bg-white" /> LIVE · back to the session
        </button>
      ) : (
        next && (
          <div className="absolute top-3 right-3 max-w-[60%] truncate rounded-full bg-black/35 px-3 py-1 text-sm text-blue-100">
            Next session: {next.session.title} · {whenLabel(next, now)}
          </div>
        )
      )}
    </div>
  )
}

/** Live session on the big screen: header, video (or a join card), footer. */
function LiveScreen({ o, now, focused, onSlides }: { o: Occurrence; now: number; focused: boolean; onSlides: () => void }) {
  const embed = videoEmbed(o.session.videoUrl)
  const join = safeLink(o.session.joinUrl)
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded bg-black text-white select-none">
      <header className="flex items-center gap-3 bg-gradient-to-r from-rose-700 to-fuchsia-800 px-5 py-2.5">
        <span className="flex items-center gap-1.5 rounded bg-white px-2 py-0.5 text-xs font-extrabold text-rose-700">
          <span className="size-2 animate-pulse rounded-full bg-rose-600" /> LIVE
        </span>
        <span className="truncate text-lg font-semibold">{o.session.title}</span>
        <span className="ml-auto shrink-0 text-sm text-rose-100">with {o.session.host}</span>
      </header>
      <div className="relative flex-1">
        {embed ? (
          <SessionVideo embed={embed} title={o.session.title} className="absolute inset-0 h-full w-full" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-900 to-indigo-950 p-10 text-center">
            <p className="text-3xl font-bold">{o.session.title}</p>
            <p className="max-w-xl text-lg text-slate-300">{o.session.description}</p>
            {join ? (
              <a href={join} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-white px-6 py-3 text-lg font-semibold text-indigo-900">
                Join the call ↗
              </a>
            ) : (
              <p className="text-slate-400">This session is happening now.</p>
            )}
          </div>
        )}
      </div>
      <footer className="flex items-center justify-between bg-slate-950 px-5 py-2 text-sm text-slate-400">
        <span>{whenLabel(o, now)}</span>
        {focused ? (
          <button type="button" onClick={onSlides} className="rounded bg-white/10 px-3 py-1 text-slate-200 hover:bg-white/20">
            Show slides
          </button>
        ) : (
          <span>Press E in front of the screen to watch</span>
        )}
      </footer>
    </div>
  )
}
