/**
 * Conference-room sessions — PLACEHOLDER schedule, edit freely.
 *
 * Each session is either one-off (`start`, an ISO time with offset) or weekly (`weekly`: day
 * 0 = Sunday … 6 = Saturday, time in Indian Standard Time). While a session is live:
 * - `videoUrl` plays on the conference screen and in the Sessions panel: a YouTube or Vimeo
 *   link, or an https link to an .mp4 you host. Only use videos you own or have rights to.
 * - `joinUrl` adds a "Join the call" button (Google Meet, Zoom, Jitsi, Teams… opens a new tab).
 * Leave either empty and the UI simply hides that part.
 */
export type SessionKind = 'Talk' | 'Workshop' | 'Meetup' | 'Q&A'

export interface Session {
  id: string
  title: string
  host: string
  kind: SessionKind
  description: string
  /** One-off start, e.g. '2026-11-14T18:00:00+05:30'. */
  start?: string
  /** Weekly slot in IST: day 0 = Sun … 6 = Sat, time 'HH:MM'. */
  weekly?: { day: number; time: string }
  durationMin: number
  joinUrl?: string
  videoUrl?: string
}

/** Offset of the times in `weekly` slots (Indian Standard Time). */
export const SESSION_UTC_OFFSET_MIN = 330

export const SESSIONS: Session[] = [
  {
    id: 'open-house',
    title: 'Campus open house',
    host: 'Campus team',
    kind: 'Meetup',
    description: 'A guided walk around the campus for new visitors: the classrooms, the arcade, the sports ground — bring your questions.',
    weekly: { day: 6, time: '11:00' },
    durationMin: 45,
    joinUrl: '',
    videoUrl: '',
  },
  {
    id: 'office-hours',
    title: 'Office hours: ask the team',
    host: 'Campus team',
    kind: 'Q&A',
    description: 'Stuck on a lesson or curious how the campus is built? Drop in and ask anything.',
    weekly: { day: 3, time: '18:00' },
    durationMin: 60,
    joinUrl: '',
    videoUrl: '',
  },
  {
    id: 'first-web-page',
    title: 'Workshop: build your first web page',
    host: 'Campus team',
    kind: 'Workshop',
    description: 'Follow along live: HTML, a little CSS, and publishing the page — no experience needed.',
    weekly: { day: 5, time: '17:00' },
    durationMin: 90,
    joinUrl: '',
    videoUrl: '',
  },
]
