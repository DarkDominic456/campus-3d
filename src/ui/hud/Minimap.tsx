import { useEffect, useRef } from 'react'
import { playerRuntime, teleportTo } from '../../player/playerRuntime'
import { useGameStore } from '../../store/useGameStore'
import { ZONES, type ZoneDef } from '../../world/zoneConfig'
import { BUILDING, GATE_Z, WORLD } from '../../world/layout'
import { peerStates, usePresence } from '../../multiplayer/presence'

const PAD = 2
const VIEW = {
  x: WORLD.minX - PAD,
  y: WORLD.minZ - PAD,
  w: WORLD.maxX - WORLD.minX + PAD * 2,
  h: WORLD.maxZ - WORLD.minZ + PAD * 2,
}
const SHORT_LABEL: Record<string, string> = {
  classroom: 'Class',
  gaming: 'Gaming',
  hall: '',
  office: 'Office',
  conference: 'Conf.',
  corridor: '',
  basketball: 'Basket',
  football: 'Football',
  cricket: 'Cricket',
}
const OUTDOOR_ZONES = ['basketball', 'football', 'cricket']
const INDOOR_ZONES = ['classroom', 'gaming', 'hall', 'office', 'conference', 'corridor']

/**
 * Top-down map (−Z is up). World units are used directly as SVG units (y = z).
 * The player marker is moved imperatively every frame; React only re-renders on floor change.
 */
export function Minimap() {
  const floor = useGameStore((s) => s.currentFloor)
  const overlayOpen = useGameStore((s) => s.activeOverlay !== null)
  const marker = useRef<SVGGElement>(null)
  const peerDots = useRef<SVGGElement>(null)
  const peerIds = usePresence((s) => Object.keys(s.peers).join(','))

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const { x, z } = playerRuntime.position
      const f = playerRuntime.facing
      // Marker points "up" (−Z) at 0°; SVG rotation is clockwise.
      const deg = (Math.atan2(Math.sin(f), -Math.cos(f)) * 180) / Math.PI
      marker.current?.setAttribute('transform', `translate(${x.toFixed(2)} ${z.toFixed(2)}) rotate(${deg.toFixed(1)})`)
      // Other visitors: one dot each, moved like the player marker.
      for (const dot of peerDots.current?.children ?? []) {
        const st = peerStates.get(dot.getAttribute('data-id') ?? '')
        dot.setAttribute('visibility', st ? 'visible' : 'hidden')
        if (st) dot.setAttribute('transform', `translate(${st.p[0].toFixed(1)} ${st.p[2].toFixed(1)})`)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const zones = ZONES.filter(
    (z) => OUTDOOR_ZONES.includes(z.id) || (INDOOR_ZONES.includes(z.id) && z.floor === floor),
  )

  const go = (zone: ZoneDef) => {
    if (!zone.spawn || overlayOpen) return
    teleportTo(zone.spawn.position, zone.spawn.facing)
  }

  return (
    <div className="pointer-events-auto hidden w-48 overflow-hidden rounded-xl bg-slate-900/75 p-2 shadow-lg ring-1 ring-white/15 backdrop-blur sm:block">
      <div className="mb-1 flex items-center justify-between px-1 text-[11px] font-medium text-slate-300">
        <span>Map</span>
        <span>{floor === 1 ? 'First floor' : 'Ground floor'}</span>
      </div>
      <svg viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} className="block w-full" aria-label="Campus minimap">
        <rect x={WORLD.minX} y={WORLD.minZ} width={WORLD.maxX - WORLD.minX} height={WORLD.maxZ - WORLD.minZ} fill="#4d7c4a" rx={2} />
        {/* Gate line */}
        <line x1={WORLD.minX} x2={-5} y1={GATE_Z} y2={GATE_Z} stroke="#1f3d22" strokeWidth={1} />
        <line x1={5} x2={WORLD.maxX} y1={GATE_Z} y2={GATE_Z} stroke="#1f3d22" strokeWidth={1} />
        <rect x={-5} y={GATE_Z - 0.8} width={10} height={1.6} fill="#a8a29e" />
        {/* Paths */}
        <rect x={-3} y={BUILDING.maxZ} width={6} height={WORLD.maxZ - BUILDING.maxZ} fill="#a8a29e" opacity={0.6} />
        <rect x={-2} y={-34} width={4} height={BUILDING.minZ + 34} fill="#a8a29e" opacity={0.6} />
        {/* Building outline */}
        <rect
          x={BUILDING.minX}
          y={BUILDING.minZ}
          width={BUILDING.maxX - BUILDING.minX}
          height={BUILDING.maxZ - BUILDING.minZ}
          fill="#e2e8f0"
          stroke="#0f172a"
          strokeWidth={0.8}
        />
        {zones.map((z) => {
          const w = z.max[0] - z.min[0]
          const h = z.max[2] - z.min[2]
          const label = SHORT_LABEL[z.id]
          return (
            <g
              key={z.id}
              onClick={() => go(z)}
              className={z.spawn ? 'cursor-pointer hover:opacity-80' : undefined}
            >
              <title>{z.spawn ? `Teleport to ${z.label}` : z.label}</title>
              <rect x={z.min[0]} y={z.min[2]} width={w} height={h} fill={z.color} opacity={0.85} stroke="#0f172a" strokeWidth={0.4} />
              {label && (
                <text
                  x={z.min[0] + w / 2}
                  y={z.min[2] + h / 2}
                  fontSize={4.2}
                  fill="#fff"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{ pointerEvents: 'none', fontWeight: 600 }}
                >
                  {label}
                </text>
              )}
            </g>
          )
        })}
        <text x={0} y={GATE_Z + 6} fontSize={4.2} fill="#e2e8f0" textAnchor="middle" style={{ fontWeight: 600 }}>
          Gate
        </text>
        <g ref={peerDots} style={{ pointerEvents: 'none' }}>
          {peerIds &&
            peerIds.split(',').map((id) => <circle key={id} data-id={id} r={2.2} fill="#fbbf24" stroke="#78350f" strokeWidth={0.5} visibility="hidden" />)}
        </g>
        <g ref={marker} style={{ pointerEvents: 'none' }}>
          <circle r={4.5} fill="#38bdf8" opacity={0.25} />
          <polygon points="0,-3.4 2.4,2.6 0,1.3 -2.4,2.6" fill="#f8fafc" stroke="#0369a1" strokeWidth={0.6} />
        </g>
      </svg>
      <p className="mt-1 px-1 text-[10px] text-slate-400">Click a zone to teleport</p>
    </div>
  )
}
