import { OverlayShell } from './OverlayShell'
import { useGameStore, type OverlayPropsMap } from '../../store/useGameStore'
import { AVATAR_LABELS } from '../../assets/models'
import { PRESENCE_MODE, sendEmote, usePresence } from '../../multiplayer/presence'
import { PrivacyToggles } from './PrivacyToggles'

const STATUS_TEXT = {
  online: '',
  connecting: 'Connecting…',
  offline: 'Connection lost — reconnecting…',
  off: 'You are hidden. Turn on "Show me to other visitors" to see who is here.',
  unavailable: 'Multiplayer is not set up on this site yet.',
} as const

/** HUD → "N online": who is on campus, plus your privacy switches. */
export function PeopleOverlay(_: OverlayPropsMap['people']) {
  const status = usePresence((s) => s.status)
  const peers = usePresence((s) => s.peers)
  const muted = usePresence((s) => s.muted)
  const openOverlay = useGameStore((s) => s.openOverlay)
  const list = Object.entries(peers).sort(([, a], [, b]) => a.name.localeCompare(b.name))

  return (
    <OverlayShell title="People on campus">
      <div className="space-y-5">
        {PRESENCE_MODE === 'local' && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Local preview: no multiplayer server is configured, so only other tabs of this browser appear here. See
            server/README.md.
          </p>
        )}
        {STATUS_TEXT[status] && <p className="text-sm text-slate-600">{STATUS_TEXT[status]}</p>}
        {status === 'online' && (
          <section>
            <h3 className="mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">
              {list.length === 0 ? 'Nobody else is here right now' : `${list.length} other visitor${list.length > 1 ? 's' : ''}`}
            </h3>
            <ul className="divide-y divide-slate-100">
              {list.map(([id, info]) => (
                <li key={id} className="flex items-center gap-3 py-2">
                  {info.card?.photo ? (
                    <img src={info.card.photo} alt="" className="size-9 rounded-full object-cover" />
                  ) : (
                    <span className="flex size-9 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700">
                      {info.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {info.name} {muted.includes(id) && <span className="text-xs font-normal text-slate-400">(chat hidden)</span>}
                    </p>
                    <p className="truncate text-xs text-slate-500">{info.tagline || AVATAR_LABELS[info.avatar]}</p>
                  </div>
                  <button type="button" onClick={() => openOverlay('peerCard', { id })} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-slate-400">
                    View card
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Press Enter to chat · 1–4 for emotes</span>
              <button type="button" onClick={() => sendEmote('wave')} className="rounded-full bg-slate-100 px-2.5 py-1 hover:bg-slate-200">
                👋 Wave to everyone
              </button>
            </div>
          </section>
        )}
        <section>
          <h3 className="mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">Your privacy</h3>
          <PrivacyToggles />
        </section>
      </div>
    </OverlayShell>
  )
}

