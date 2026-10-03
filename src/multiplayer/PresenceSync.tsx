import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { useSettings } from '../settings/settings'
import { displayName } from '../services/auth'
import { thumbnailJpeg } from '../utils/image'
import { playerRuntime } from '../player/playerRuntime'
import {
  PRESENCE_MODE,
  connectPresence,
  disconnectPresence,
  sendPresenceState,
  updatePresenceInfo,
  usePresence,
  type PeerInfo,
} from './presence'

const SEND_MS = 100
const HEARTBEAT_MS = 2000

/** A stable "Guest 1234" for this browser tab session. */
function guestName() {
  try {
    let name = sessionStorage.getItem('campus3d.guestName')
    if (!name) sessionStorage.setItem('campus3d.guestName', (name = `Guest ${1000 + Math.floor(Math.random() * 9000)}`))
    return name
  } catch {
    return 'Guest'
  }
}

/**
 * What other visitors see: name, avatar, tagline — plus photo / location / about only when the
 * visitor opted in (Settings → "Share my profile card"). Phone and email are never shared.
 */
function usePublicInfo(): PeerInfo | null {
  const user = useGameStore((s) => s.user)
  const avatar = useGameStore((s) => s.playerAvatar)
  const shareCard = useSettings((s) => s.shareCard)
  const [info, setInfo] = useState<PeerInfo | null>(null)
  useEffect(() => {
    let cancelled = false
    const base: PeerInfo = { name: user ? displayName(user) : guestName(), avatar, tagline: user?.profile.tagline.slice(0, 80) ?? '' }
    if (!user || !shareCard) {
      setInfo(base)
      return
    }
    thumbnailJpeg(user.profile.photo).then((photo) => {
      if (cancelled) return
      setInfo({ ...base, card: { photo, location: user.profile.location.slice(0, 80), about: user.profile.about.slice(0, 300) } })
    })
    return () => {
      cancelled = true
    }
  }, [user, avatar, shareCard])
  return info
}

/** Connects to presence, keeps your public info current and streams your position (3D only). */
export function PresenceSync() {
  const enabled = useSettings((s) => s.showPresence) && PRESENCE_MODE !== null
  const info = usePublicInfo()
  const infoRef = useRef(info)
  infoRef.current = info
  const ready = info !== null

  useEffect(() => {
    if (!enabled || !ready || !infoRef.current) return
    connectPresence(infoRef.current)
    return () => disconnectPresence()
  }, [enabled, ready])

  useEffect(() => {
    if (enabled && info) updatePresenceInfo(info)
  }, [enabled, info])

  // Position stream: only when something changed, plus a heartbeat.
  useEffect(() => {
    if (!enabled) return
    const last = { x: 0, y: 0, z: 0, f: 0, a: '', at: 0 }
    const id = window.setInterval(() => {
      if (usePresence.getState().status !== 'online') return
      const { x, y, z } = playerRuntime.position
      const f = playerRuntime.facing
      const a = useGameStore.getState().playerAnimation
      const now = performance.now()
      const moved = Math.abs(x - last.x) + Math.abs(y - last.y) + Math.abs(z - last.z) > 0.02 || Math.abs(f - last.f) > 0.05 || a !== last.a
      if (!moved && now - last.at < HEARTBEAT_MS) return
      Object.assign(last, { x, y, z, f, a, at: now })
      sendPresenceState({ p: [x, y, z], f, a })
    }, SEND_MS)
    return () => window.clearInterval(id)
  }, [enabled])

  // Your own wave emote also plays the wave animation for a moment.
  useEffect(
    () =>
      usePresence.subscribe((s, prev) => {
        const mine = s.emotes.self
        if (mine && mine !== prev.emotes.self && mine.e === 'wave') playerRuntime.emoteUntil = performance.now() + 2200
      }),
    [],
  )

  return null
}
