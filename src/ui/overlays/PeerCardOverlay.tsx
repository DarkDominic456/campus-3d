import { OverlayShell } from './OverlayShell'
import type { OverlayPropsMap } from '../../store/useGameStore'
import { AVATAR_LABELS } from '../../assets/models'
import { sendEmote, usePresence } from '../../multiplayer/presence'

/** Another visitor's public card (walk up to them and press E, or People → View card). */
export function PeerCardOverlay({ id }: OverlayPropsMap['peerCard']) {
  const info = usePresence((s) => s.peers[id])
  const muted = usePresence((s) => s.muted.includes(id))
  const toggleMute = usePresence((s) => s.toggleMute)

  if (!info) {
    return (
      <OverlayShell title="Visitor">
        <p className="text-slate-600">This visitor has left the campus.</p>
      </OverlayShell>
    )
  }

  const card = info.card
  return (
    <OverlayShell title="Visitor card">
      <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 p-5 text-white">
        {card?.photo ? (
          <img src={card.photo} alt="" className="size-16 rounded-full object-cover ring-2 ring-white/70" />
        ) : (
          <span className="flex size-16 items-center justify-center rounded-full bg-white/20 text-2xl font-bold ring-2 ring-white/50">
            {info.name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-xl font-bold">{info.name}</p>
          {info.tagline && <p className="truncate text-sm text-sky-100">{info.tagline}</p>}
          {card?.location && <p className="truncate text-xs text-sky-100/80">{card.location}</p>}
        </div>
      </div>
      {card?.about ? (
        <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-slate-700">{card.about}</p>
      ) : (
        <p className="mt-4 text-sm text-slate-500">{info.name} hasn't shared more about themselves.</p>
      )}
      <p className="mt-3 text-xs text-slate-400">Avatar: {AVATAR_LABELS[info.avatar]}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={() => sendEmote('wave')} className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400">
          👋 Wave
        </button>
        <button type="button" onClick={() => toggleMute(id)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400">
          {muted ? 'Show their chat' : 'Hide their chat'}
        </button>
      </div>
    </OverlayShell>
  )
}
