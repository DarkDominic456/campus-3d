import { OverlayShell } from './OverlayShell'
import { useGameStore } from '../../store/useGameStore'
import { teleportTo } from '../../player/playerRuntime'
import { ZONES, type ZoneDef } from '../../world/zoneConfig'

const GROUPS: { title: string; ids: string[] }[] = [
  { title: 'Outside', ids: ['gate', 'outdoor'] },
  { title: 'Ground floor', ids: ['hall', 'classroom', 'gaming'] },
  { title: 'First floor', ids: ['office', 'conference'] },
  { title: 'Sports', ids: ['basketball', 'football', 'cricket'] },
]

export function TeleportOverlay() {
  const closeOverlay = useGameStore((s) => s.closeOverlay)
  const currentZone = useGameStore((s) => s.currentZone)

  const go = (zone: ZoneDef) => {
    if (!zone.spawn) return
    teleportTo(zone.spawn.position, zone.spawn.facing)
    closeOverlay()
  }

  return (
    <OverlayShell title="Teleport to…">
      <div className="grid gap-5 sm:grid-cols-2">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">{group.title}</h3>
            <ul className="space-y-1.5">
              {group.ids.map((id) => {
                const zone = ZONES.find((z) => z.id === id)
                if (!zone?.spawn) return null
                const here = zone.id === currentZone
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => go(zone)}
                      className="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-left hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-500"
                    >
                      <span className="size-3 shrink-0 rounded-sm" style={{ background: zone.color }} />
                      <span className="flex-1 font-medium">{zone.label}</span>
                      {here && <span className="text-xs text-slate-500">You are here</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </OverlayShell>
  )
}
