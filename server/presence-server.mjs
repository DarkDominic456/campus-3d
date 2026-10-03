/**
 * Campus 3D presence server: a small WebSocket relay so visitors see each other walk around,
 * chat and send emotes. No database, no accounts — it only keeps who is connected right now.
 *
 *   npm run server                       # from the repo root (ws://localhost:8787)
 *   PORT=8787 ALLOWED_ORIGINS=https://your-site.vercel.app node server/presence-server.mjs
 *
 * Protocol (JSON text frames), client → server:
 *   { t: 'hello', info }            who I am: { name, avatar, tagline, card? }
 *   { t: 'state', p: [x,y,z], f, a } position (capsule centre), facing (rad), animation
 *   { t: 'chat', text }             { t: 'emote', e }            { t: 'info', info }
 * server → client:
 *   { t: 'welcome', id, peers: [{ id, info, state }] }   { t: 'join', id, info }   { t: 'leave', id }
 *   { t: 'state', id, p, f, a }   { t: 'chat', id, text, at }   { t: 'emote', id, e }   { t: 'info', id, info }
 *
 * Everything from clients is validated, clamped and rate limited here: never trust the browser.
 */
import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { WebSocketServer } from 'ws'

const PORT = Number(process.env.PORT ?? 8787)
/** Comma-separated list of allowed page origins; empty = allow any (local development). */
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
const MAX_PER_ROOM = Number(process.env.MAX_PER_ROOM ?? 60)
const MAX_MESSAGE_BYTES = 12_000 // a 64 px profile thumbnail fits comfortably
const ANIMS = new Set(['idle', 'walk', 'run', 'jump', 'fall', 'sit', 'study', 'talk', 'wave'])
const EMOTES = new Set(['wave', 'thumbs', 'laugh', 'heart'])
const AVATAR = /^(male|female)-[a-f]$/

/** Per-client budgets: tokens refill per second, up to the burst size. */
const LIMITS = { state: { rate: 20, burst: 30 }, chat: { rate: 0.5, burst: 3 }, emote: { rate: 1, burst: 3 }, info: { rate: 0.2, burst: 3 } }

/** Control characters, zero-width / direction marks and line separators (by code point). */
const unsafe = (n) => n < 32 || n === 127 || (n >= 0x200b && n <= 0x200f) || (n >= 0x2028 && n <= 0x202e)

const clean = (value, max) =>
  typeof value === 'string'
    ? [...value]
        .filter((c) => !unsafe(c.codePointAt(0)))
        .join('')
        .trim()
        .slice(0, max)
    : ''

function cleanInfo(info) {
  if (!info || typeof info !== 'object') return null
  const name = clean(info.name, 40)
  if (!name) return null
  const out = { name, avatar: AVATAR.test(info.avatar) ? info.avatar : 'male-a', tagline: clean(info.tagline, 80) }
  const card = info.card
  if (card && typeof card === 'object') {
    const photo = typeof card.photo === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(card.photo) && card.photo.length <= 9000 ? card.photo : ''
    out.card = { photo, location: clean(card.location, 80), about: clean(card.about, 300) }
  }
  return out
}

const finite = (v, limit) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(-limit, Math.min(limit, v)) : 0)

function cleanState(msg) {
  if (!Array.isArray(msg.p) || msg.p.length !== 3) return null
  return {
    p: msg.p.map((v) => Math.round(finite(v, 500) * 100) / 100),
    f: Math.round(finite(msg.f, 10) * 100) / 100,
    a: ANIMS.has(msg.a) ? msg.a : 'idle',
  }
}

/** room name → Map<id, client> */
const rooms = new Map()
/** Answered the last ping? */
const alive = new WeakMap()

function broadcast(room, data, except) {
  const text = JSON.stringify(data)
  for (const client of room.values()) if (client !== except && client.ws.readyState === 1) client.ws.send(text)
}

function allow(client, kind) {
  const limit = LIMITS[kind]
  const now = Date.now() / 1000
  const bucket = (client.buckets[kind] ??= { tokens: limit.burst, at: now })
  bucket.tokens = Math.min(limit.burst, bucket.tokens + (now - bucket.at) * limit.rate)
  bucket.at = now
  if (bucket.tokens < 1) return false
  bucket.tokens -= 1
  return true
}

const http = createServer((req, res) => {
  // Health check for hosts (Render, Fly…) and a quick "is it up?" in the browser.
  const online = [...rooms.values()].reduce((n, r) => n + r.size, 0)
  res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' })
  res.end(JSON.stringify({ ok: true, online }))
})

const wss = new WebSocketServer({
  server: http,
  maxPayload: MAX_MESSAGE_BYTES,
  verifyClient: ({ origin }) => ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin),
})

wss.on('connection', (ws, req) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const roomName = clean(url.searchParams.get('room') ?? 'campus', 40) || 'campus'
  let room = rooms.get(roomName)
  if (!room) rooms.set(roomName, (room = new Map()))
  if (room.size >= MAX_PER_ROOM) {
    ws.close(1013, 'Room is full')
    return
  }

  const client = { id: randomUUID().slice(0, 8), ws, info: null, state: null, buckets: {} }
  alive.set(ws, true)
  ws.on('pong', () => alive.set(ws, true))

  ws.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      return
    }
    if (!msg || typeof msg !== 'object') return

    if (msg.t === 'hello' && !client.info) {
      const info = cleanInfo(msg.info)
      if (!info) return
      client.info = info
      room.set(client.id, client)
      const peers = [...room.values()].filter((c) => c !== client && c.info).map((c) => ({ id: c.id, info: c.info, state: c.state }))
      ws.send(JSON.stringify({ t: 'welcome', id: client.id, peers }))
      broadcast(room, { t: 'join', id: client.id, info }, client)
      return
    }
    if (!client.info) return // must say hello first

    if (msg.t === 'state' && allow(client, 'state')) {
      const state = cleanState(msg)
      if (!state) return
      client.state = state
      broadcast(room, { t: 'state', id: client.id, ...state }, client)
    } else if (msg.t === 'chat' && allow(client, 'chat')) {
      const text = clean(msg.text, 200)
      if (text) broadcast(room, { t: 'chat', id: client.id, text, at: Date.now() })
    } else if (msg.t === 'emote' && allow(client, 'emote')) {
      if (EMOTES.has(msg.e)) broadcast(room, { t: 'emote', id: client.id, e: msg.e }, client)
    } else if (msg.t === 'info' && allow(client, 'info')) {
      const info = cleanInfo(msg.info)
      if (!info) return
      client.info = info
      broadcast(room, { t: 'info', id: client.id, info }, client)
    }
  })

  ws.on('close', () => {
    if (room.delete(client.id) && client.info) broadcast(room, { t: 'leave', id: client.id })
    if (room.size === 0) rooms.delete(roomName)
  })
})

// Drop connections that stopped answering pings (closed laptop lids, dead networks).
setInterval(() => {
  for (const ws of wss.clients) {
    if (!alive.get(ws)) {
      ws.terminate()
      continue
    }
    alive.set(ws, false)
    ws.ping()
  }
}, 20_000).unref()

http.listen(PORT, () => console.log(`Campus 3D presence server on ws://localhost:${PORT}${ALLOWED_ORIGINS.length ? ` (origins: ${ALLOWED_ORIGINS.join(', ')})` : ''}`))
