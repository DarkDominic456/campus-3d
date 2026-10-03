import { downloadIcs, safeLink, schedule, useNow, videoEmbed, whenLabel, type Embed, type Occurrence } from '../../sessions/schedule'

const JOIN_EARLY_MS = 10 * 60_000

/**
 * Session schedule: what's live and what's next, with Join / Watch / Add to calendar.
 * Shared by the 3D Sessions panel (`onWatch` = go to the big screen) and the 2D site
 * (`inlineVideo` = play the live video right here). No three.js.
 */
export function SessionsContent({ onWatch, inlineVideo = false }: { onWatch?: (o: Occurrence) => void; inlineVideo?: boolean }) {
  const now = useNow(15_000)
  const list = schedule(now)
  const live = list.filter((o) => o.live)
  const upcoming = list.filter((o) => !o.live)

  return (
    <div className="space-y-6">
      {live.map((o) => (
        <LiveCard key={o.session.id} o={o} now={now} onWatch={onWatch} inlineVideo={inlineVideo} />
      ))}
      <section>
        <h3 className="mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">{live.length ? 'Coming up' : 'Upcoming sessions'}</h3>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-500">No sessions scheduled yet — check back soon.</p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((o) => {
              const join = safeLink(o.session.joinUrl)
              const joinOpen = o.start.getTime() - now <= JOIN_EARLY_MS
              return (
                <li key={o.session.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-sky-50 px-2 py-0.5 font-semibold text-sky-700">{o.session.kind}</span>
                    <span className="text-slate-500">{whenLabel(o, now)}</span>
                  </div>
                  <p className="mt-1.5 font-semibold text-slate-900">{o.session.title}</p>
                  <p className="text-xs text-slate-500">with {o.session.host}</p>
                  <p className="mt-1.5 text-sm text-slate-600">{o.session.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => downloadIcs(o)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400">
                      📅 Add to calendar
                    </button>
                    {join &&
                      (joinOpen ? (
                        <a href={join} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-400">
                          Join the call ↗
                        </a>
                      ) : (
                        <span className="px-1 py-1.5 text-xs text-slate-400">Join link opens 10 min before</span>
                      ))}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
      <p className="text-xs text-slate-400">Times are shown in your time zone.</p>
    </div>
  )
}

function LiveCard({ o, now, onWatch, inlineVideo }: { o: Occurrence; now: number; onWatch?: (o: Occurrence) => void; inlineVideo: boolean }) {
  const join = safeLink(o.session.joinUrl)
  const embed = inlineVideo ? videoEmbed(o.session.videoUrl) : null
  return (
    <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-rose-600 to-fuchsia-700 text-white shadow-lg">
      {embed && <SessionVideo embed={embed} title={o.session.title} className="aspect-video w-full" />}
      <div className="p-5">
        <p className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
          <span className="size-2 animate-pulse rounded-full bg-white" aria-hidden /> Live now · {o.session.kind}
        </p>
        <p className="mt-1 text-xl font-bold">{o.session.title}</p>
        <p className="text-sm text-rose-100">
          with {o.session.host} · {whenLabel(o, now)}
        </p>
        <p className="mt-2 text-sm text-rose-50">{o.session.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {onWatch && (
            <button type="button" onClick={() => onWatch(o)} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50">
              ▶ Watch on the big screen
            </button>
          )}
          {join && (
            <a href={join} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/40 hover:bg-white/25">
              Join the call ↗
            </a>
          )}
          <button type="button" onClick={() => downloadIcs(o)} className="rounded-lg px-3 py-2 text-sm text-rose-100 hover:bg-white/10">
            📅 Add to calendar
          </button>
        </div>
      </div>
    </section>
  )
}

/** Embedded session video (YouTube no-cookie / Vimeo iframe, or a hosted .mp4). */
export function SessionVideo({ embed, title, className = '' }: { embed: Embed; title: string; className?: string }) {
  if (embed.kind === 'video') {
    return <video src={embed.src} title={title} className={`bg-black ${className}`} autoPlay muted playsInline controls />
  }
  return (
    <iframe
      src={embed.src}
      title={title}
      className={`bg-black ${className}`}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      referrerPolicy="strict-origin-when-cross-origin"
      sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
      allowFullScreen
    />
  )
}
