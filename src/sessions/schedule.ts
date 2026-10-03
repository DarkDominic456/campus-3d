import { useEffect, useState } from 'react'
import { SESSIONS, SESSION_UTC_OFFSET_MIN, type Session } from '../content/sessions'

/**
 * Turns the session list (content/sessions.ts) into concrete times: what is live now and what
 * comes next. Pure — shared by the 3D campus and the 2D site. Times are computed in IST for
 * weekly slots and shown in the visitor's own time zone.
 */
export interface Occurrence {
  session: Session
  start: Date
  end: Date
  live: boolean
}

const MIN = 60_000
const DAY = 24 * 60 * MIN

/** The weekly slot's current (if still running) or next occurrence. */
function weekly(session: Session, now: number): { start: number; end: number } {
  const slot = session.weekly!
  const [h, m] = slot.time.split(':').map(Number)
  const duration = session.durationMin * MIN
  // Wall-clock IST as UTC fields, so getUTC* read Indian date / weekday.
  const ist = new Date(now + SESSION_UTC_OFFSET_MIN * MIN)
  const dayDiff = (slot.day - ist.getUTCDay() + 7) % 7
  let start = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + dayDiff, h, m) - SESSION_UTC_OFFSET_MIN * MIN
  // Last week's occurrence may still be running (e.g. a late-night session past midnight).
  if (start - 7 * DAY + duration > now) start -= 7 * DAY
  else if (start + duration <= now) start += 7 * DAY
  return { start, end: start + duration }
}

function occurrence(session: Session, now: number): Occurrence | null {
  let start: number
  let end: number
  if (session.weekly) ({ start, end } = weekly(session, now))
  else if (session.start) {
    start = Date.parse(session.start)
    if (Number.isNaN(start)) return null
    end = start + session.durationMin * MIN
    if (end <= now) return null // over
  } else return null
  return { session, start: new Date(start), end: new Date(end), live: start <= now && now < end }
}

/** Dev only: `?liveDemo=1` adds a session that started 10 minutes ago (`&liveVideo=<url>` to test embeds). */
function demoSessions(now: number): Session[] {
  if (!import.meta.env.DEV || typeof location === 'undefined') return []
  const params = new URLSearchParams(location.search)
  if (params.get('liveDemo') !== '1') return []
  return [
    {
      id: 'dev-demo',
      title: 'Demo: live session (dev only)',
      host: 'Campus team',
      kind: 'Talk',
      description: 'Shown with ?liveDemo=1 to try the live-session features.',
      start: new Date(now - 10 * MIN).toISOString(),
      durationMin: 60,
      joinUrl: 'https://example.com/join',
      videoUrl: params.get('liveVideo') ?? '',
    },
  ]
}

/** Live sessions first, then upcoming ones by start time. */
export function schedule(now = Date.now()): Occurrence[] {
  return [...demoSessions(now), ...SESSIONS]
    .map((s) => occurrence(s, now))
    .filter((o): o is Occurrence => o !== null)
    .sort((a, b) => Number(b.live) - Number(a.live) || a.start.getTime() - b.start.getTime())
}

export const liveSession = (now = Date.now()) => schedule(now).find((o) => o.live) ?? null

/** Re-renders every `ms` so "live" / countdowns stay current. */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms)
    return () => window.clearInterval(id)
  }, [ms])
  return now
}

// ---------------------------------------------------------------------------

export type Embed = { kind: 'iframe'; src: string } | { kind: 'video'; src: string }

/**
 * A safe embed for a session video: YouTube (privacy-enhanced no-cookie player), Vimeo, or an
 * https .mp4 / .webm. Anything else → null (shown as a link only, never embedded).
 */
export function videoEmbed(url: string | undefined, autoplay = true): Embed | null {
  if (!url) return null
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return null
  }
  if (u.protocol !== 'https:') return null
  const host = u.hostname.replace(/^(www|m)\./, '')
  const play = autoplay ? '1' : '0'
  if (host === 'youtube.com' || host === 'youtu.be') {
    const id =
      host === 'youtu.be' ? u.pathname.slice(1) : (u.searchParams.get('v') ?? u.pathname.match(/^\/(?:embed|live|shorts)\/([^/]+)/)?.[1] ?? '')
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null
    return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=${play}&mute=1&rel=0&playsinline=1` }
  }
  if (host === 'vimeo.com') {
    const id = u.pathname.match(/^\/(\d+)/)?.[1]
    return id ? { kind: 'iframe', src: `https://player.vimeo.com/video/${id}?autoplay=${play}&muted=1` } : null
  }
  if (/\.(mp4|webm)$/i.test(u.pathname)) return { kind: 'video', src: u.href }
  return null
}

/** Only https links become "Join" buttons. */
export const safeLink = (url: string | undefined) => {
  try {
    return url && new URL(url).protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------

const CRLF = String.fromCharCode(13, 10)
const BACKSLASH = String.fromCharCode(92)

/** RFC 5545 text escaping. */
const icsText = (s: string) =>
  s
    .split(BACKSLASH)
    .join(BACKSLASH + BACKSLASH)
    .replace(/;/g, `${BACKSLASH};`)
    .replace(/,/g, `${BACKSLASH},`)
    .split(String.fromCharCode(10))
    .join(`${BACKSLASH}n`)

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

/** An .ics calendar file for the occurrence (weekly sessions repeat). */
export function sessionIcs(o: Occurrence, siteUrl: string) {
  const s = o.session
  const join = safeLink(s.joinUrl)
  const description = [s.description, `Host: ${s.host}`, join ? `Join: ${join}` : '', `Campus 3D conference room: ${siteUrl}`].filter(Boolean).join(String.fromCharCode(10))
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Campus 3D//Sessions//EN',
    'BEGIN:VEVENT',
    `UID:${s.id}-${icsDate(o.start)}@campus3d`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(o.start)}`,
    `DTEND:${icsDate(o.end)}`,
    ...(s.weekly ? ['RRULE:FREQ=WEEKLY'] : []),
    `SUMMARY:${icsText(s.title)}`,
    `DESCRIPTION:${icsText(description)}`,
    `URL:${siteUrl}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join(CRLF)
}

/** Download the .ics (browser). */
export function downloadIcs(o: Occurrence) {
  const blob = new Blob([sessionIcs(o, `${location.origin}/`)], { type: 'text/calendar' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${o.session.id}.ics`
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

/** "Sat, 11:00 · in 2 days" / "Until 18:00" (live), in the visitor's time zone. */
export function whenLabel(o: Occurrence, now = Date.now()) {
  const time = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })
  if (o.live) return `Until ${time.format(o.end)}`
  const day = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
  const minutes = Math.round((o.start.getTime() - now) / MIN)
  const rel = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  const inText =
    minutes < 60 ? rel.format(minutes, 'minute') : minutes < 48 * 60 ? rel.format(Math.round(minutes / 60), 'hour') : rel.format(Math.round(minutes / 1440), 'day')
  return `${day.format(o.start)}, ${time.format(o.start)} · ${inText}`
}
