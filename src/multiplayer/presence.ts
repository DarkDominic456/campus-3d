import { create } from 'zustand'
import type { CharacterVariant } from '../assets/models'

/**
 * Multiplayer presence: see other visitors walk around, chat, send emotes and (opt-in) view
 * their profile cards. No three.js here — the 3D side reads `peerStates` every frame.
 *
 * Transport:
 * - `VITE_MULTIPLAYER_URL` set → WebSocket to the relay in `server/presence-server.mjs`
 *   (reconnects with back-off).
 * - Dev without a URL → "local" mode: tabs of the same browser see each other through a
 *   BroadcastChannel (the transport plays the server's part).
 * - Production without a URL → unavailable; the UI hides multiplayer.
 * The server validates and rate-limits everything; this side only shapes and caps messages.
 */
export type Emote = 'wave' | 'thumbs' | 'laugh' | 'heart'
export const EMOTES: { id: Emote; emoji: string; label: string; key: string }[] = [
  { id: 'wave', emoji: '👋', label: 'Wave', key: '1' },
  { id: 'thumbs', emoji: '👍', label: 'Thumbs up', key: '2' },
  { id: 'laugh', emoji: '😂', label: 'Laugh', key: '3' },
  { id: 'heart', emoji: '❤️', label: 'Heart', key: '4' },
]

export interface PeerCard {
  /** 64 px JPEG data URL (or ''). */
  photo: string
  location: string
  about: string
}
export interface PeerInfo {
  name: string
  avatar: CharacterVariant
  tagline: string
  card?: PeerCard
}
export interface PeerState {
  /** Capsule centre. */
  p: [number, number, number]
  f: number
  a: string
}
export interface ChatMessage {
  key: number
  id: string
  name: string
  text: string
  at: number
}

type ClientMessage =
  | { t: 'hello'; info: PeerInfo }
  | ({ t: 'state' } & PeerState)
  | { t: 'chat'; text: string }
  | { t: 'emote'; e: Emote }
  | { t: 'info'; info: PeerInfo }
type ServerMessage =
  | { t: 'welcome'; id: string; peers: { id: string; info: PeerInfo; state: PeerState | null }[] }
  | { t: 'join'; id: string; info: PeerInfo }
  | { t: 'leave'; id: string }
  | ({ t: 'state'; id: string } & PeerState)
  | { t: 'chat'; id: string; text: string; at: number }
  | { t: 'emote'; id: string; e: Emote }
  | { t: 'info'; id: string; info: PeerInfo }

export type PresenceStatus = 'unavailable' | 'off' | 'connecting' | 'online' | 'offline'

const SERVER_URL = (import.meta.env.VITE_MULTIPLAYER_URL as string | undefined) ?? ''
export const PRESENCE_MODE: 'server' | 'local' | null = SERVER_URL ? 'server' : import.meta.env.DEV ? 'local' : null
const ROOM = 'campus'
const CHAT_KEEP = 50

interface PresenceState {
  status: PresenceStatus
  selfId: string | null
  peers: Record<string, PeerInfo>
  chat: ChatMessage[]
  /** Latest emote per peer id ('self' for the local player). */
  emotes: Record<string, { e: Emote; key: number }>
  /** Peers whose chat this visitor hid (this visit only). */
  muted: string[]
  toggleMute: (id: string) => void
}

export const usePresence = create<PresenceState>()((set, get) => ({
  status: PRESENCE_MODE ? 'off' : 'unavailable',
  selfId: null,
  peers: {},
  chat: [],
  emotes: {},
  muted: [],
  toggleMute: (id) => set({ muted: get().muted.includes(id) ? get().muted.filter((m) => m !== id) : [...get().muted, id] }),
}))

/** Per-frame peer positions (outside React). */
export const peerStates = new Map<string, PeerState & { at: number }>()

// ---------------------------------------------------------------------------
// Transports

interface Transport {
  send: (msg: ClientMessage) => void
  close: () => void
}

function webSocketTransport(onMessage: (m: ServerMessage) => void, onOpen: () => void, onDown: () => void): Transport {
  let ws: WebSocket | null = null
  let closed = false
  let retry = 0
  let timer = 0
  const connect = () => {
    const url = new URL(SERVER_URL)
    url.searchParams.set('room', ROOM)
    ws = new WebSocket(url)
    ws.onopen = () => {
      retry = 0
      onOpen()
    }
    ws.onmessage = (e) => {
      try {
        onMessage(JSON.parse(e.data as string))
      } catch {
        // ignore malformed frames
      }
    }
    ws.onclose = () => {
      if (closed) return
      onDown()
      // Back off 1, 2, 4 … 30 s (free hosts can take a while to wake up).
      timer = window.setTimeout(connect, Math.min(30_000, 1000 * 2 ** retry++))
    }
  }
  connect()
  return {
    send: (msg) => {
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
    },
    close: () => {
      closed = true
      window.clearTimeout(timer)
      ws?.close()
    },
  }
}

/** Same-browser tabs over a BroadcastChannel; behaves like the server for the client code. */
function localTransport(onMessage: (m: ServerMessage) => void, onOpen: () => void): Transport {
  const channel = new BroadcastChannel(`campus3d-presence-${ROOM}`)
  const id = Math.random().toString(16).slice(2, 10)
  let info: PeerInfo | null = null
  let state: PeerState | null = null
  const lastHeard = new Map<string, number>()
  type Wire = ServerMessage | { t: 'here'; id: string; to: string; info: PeerInfo; state: PeerState | null }
  const post = (m: Wire) => channel.postMessage(m)

  channel.onmessage = (e: MessageEvent<Wire>) => {
    const m = e.data
    if (!m || m.t === 'welcome' || ('id' in m && m.id === id)) return
    lastHeard.set(m.id, Date.now())
    if (m.t === 'join' && info) post({ t: 'here', id, to: m.id, info, state })
    if (m.t === 'here') {
      if (m.to !== id) return
      onMessage({ t: 'join', id: m.id, info: m.info })
      if (m.state) onMessage({ t: 'state', id: m.id, ...m.state })
      return
    }
    onMessage(m)
  }
  // Tabs that vanish without saying goodbye (crash, killed) are dropped after 8 s of silence.
  const prune = window.setInterval(() => {
    for (const [peer, at] of lastHeard) {
      if (Date.now() - at < 8000) continue
      lastHeard.delete(peer)
      onMessage({ t: 'leave', id: peer })
    }
  }, 2000)
  const bye = () => post({ t: 'leave', id })
  window.addEventListener('pagehide', bye)
  queueMicrotask(onOpen)

  return {
    send: (msg) => {
      if (msg.t === 'hello') {
        info = msg.info
        onMessage({ t: 'welcome', id, peers: [] })
        post({ t: 'join', id, info })
      } else if (msg.t === 'state') {
        state = { p: msg.p, f: msg.f, a: msg.a }
        post({ t: 'state', id, ...state })
      } else if (msg.t === 'chat') {
        const chat = { t: 'chat' as const, id, text: msg.text, at: Date.now() }
        post(chat)
        onMessage(chat) // the server echoes chat to the sender too
      } else if (msg.t === 'emote') post({ t: 'emote', id, e: msg.e })
      else if (msg.t === 'info') {
        info = msg.info
        post({ t: 'info', id, info })
      }
    },
    close: () => {
      bye()
      window.removeEventListener('pagehide', bye)
      window.clearInterval(prune)
      channel.close()
    },
  }
}

// ---------------------------------------------------------------------------
// Client

let transport: Transport | null = null
let selfInfo: PeerInfo | null = null
let chatKey = 0

function handle(m: ServerMessage) {
  const s = usePresence.getState()
  switch (m.t) {
    case 'welcome': {
      const peers: Record<string, PeerInfo> = {}
      peerStates.clear()
      for (const p of m.peers) {
        peers[p.id] = p.info
        if (p.state) peerStates.set(p.id, { ...p.state, at: performance.now() })
      }
      usePresence.setState({ status: 'online', selfId: m.id, peers })
      break
    }
    case 'join':
    case 'info':
      usePresence.setState({ peers: { ...s.peers, [m.id]: m.info } })
      break
    case 'leave': {
      const { [m.id]: _gone, ...rest } = s.peers
      peerStates.delete(m.id)
      usePresence.setState({ peers: rest })
      break
    }
    case 'state':
      peerStates.set(m.id, { p: m.p, f: m.f, a: m.a, at: performance.now() })
      break
    case 'chat': {
      if (s.muted.includes(m.id)) break
      const name = m.id === s.selfId ? (selfInfo?.name ?? 'You') : (s.peers[m.id]?.name ?? 'Visitor')
      const chat = [...s.chat, { key: ++chatKey, id: m.id === s.selfId ? 'self' : m.id, name, text: m.text, at: Date.now() }].slice(-CHAT_KEEP)
      usePresence.setState({ chat })
      break
    }
    case 'emote':
      usePresence.setState({ emotes: { ...s.emotes, [m.id]: { e: m.e, key: Date.now() } } })
      break
  }
}

/** Connect (or re-introduce yourself) with the given public info. */
export function connectPresence(info: PeerInfo) {
  selfInfo = info
  if (transport || !PRESENCE_MODE) return
  usePresence.setState({ status: 'connecting' })
  const hello = () => selfInfo && transport?.send({ t: 'hello', info: selfInfo })
  transport =
    PRESENCE_MODE === 'server'
      ? webSocketTransport(handle, hello, () => {
          peerStates.clear()
          usePresence.setState({ status: 'offline', peers: {} })
        })
      : localTransport(handle, hello)
}

export function disconnectPresence() {
  transport?.close()
  transport = null
  peerStates.clear()
  usePresence.setState({ status: PRESENCE_MODE ? 'off' : 'unavailable', selfId: null, peers: {}, emotes: {} })
}

export function updatePresenceInfo(info: PeerInfo) {
  selfInfo = info
  if (usePresence.getState().status === 'online') transport?.send({ t: 'info', info })
}

export function sendPresenceState(state: PeerState) {
  if (usePresence.getState().status === 'online') transport?.send({ t: 'state', ...state })
}

export function sendChat(text: string) {
  const clean = text.trim().slice(0, 200)
  if (clean && usePresence.getState().status === 'online') transport?.send({ t: 'chat', text: clean })
}

/** Plays locally right away (as 'self') and tells everyone else. */
export function sendEmote(e: Emote) {
  usePresence.setState({ emotes: { ...usePresence.getState().emotes, self: { e, key: Date.now() } } })
  if (usePresence.getState().status === 'online') transport?.send({ t: 'emote', e })
}
