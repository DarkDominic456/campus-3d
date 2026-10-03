import { Suspense, useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Html, Text } from '@react-three/drei'
import type { Group } from 'three'
import { CharacterModel } from '../characters/CharacterModel'
import type { CharacterAnim } from '../characters/clips'
import { InteractPrompt } from '../interactables/InteractPrompt'
import { NPC_CULL_DISTANCE } from '../npc/StaticNpc'
import { playerRuntime } from '../player/playerRuntime'
import { CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS } from '../player/Player'
import { useGameStore } from '../store/useGameStore'
import { useSettings } from '../settings/settings'
import { EMOTES, peerStates, usePresence, type PeerInfo } from './presence'

const FEET = CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS
const ANIMS = new Set<CharacterAnim>(['idle', 'walk', 'run', 'jump', 'fall', 'sit', 'study', 'talk', 'wave'])
const CARD_RANGE = 2.2
const BUBBLE_MS = 6000
const EMOTE_MS = 2800

/** Other visitors (Canvas): animated characters with name tags, chat bubbles and emotes. */
export function RemotePlayers() {
  const peers = usePresence((s) => s.peers)
  useNearestPeerPrompt()
  return (
    <>
      {Object.entries(peers).map(([id, info]) => (
        <RemotePlayer key={id} id={id} info={info} />
      ))}
      <SelfEmote />
    </>
  )
}

/** "Press E to view …'s card" for the nearest visitor in reach (uses the normal E handling). */
function useNearestPeerPrompt() {
  const current = useRef<string | null>(null)
  useEffect(
    () => () => {
      if (current.current) useGameStore.getState().unregisterNearby(current.current)
    },
    [],
  )
  useFrame(() => {
    const p = playerRuntime.position
    let best: string | null = null
    let bestD = CARD_RANGE
    for (const [id, st] of peerStates) {
      const d = Math.hypot(st.p[0] - p.x, st.p[2] - p.z)
      if (d < bestD && Math.abs(st.p[1] - p.y) < 1.5) {
        best = id
        bestD = d
      }
    }
    const key = best ? `peer:${best}` : null
    if (key === current.current) return
    const store = useGameStore.getState()
    if (current.current) store.unregisterNearby(current.current)
    current.current = key
    if (best && key) {
      const peerId = best
      const name = usePresence.getState().peers[peerId]?.name ?? 'this visitor'
      store.registerNearby({ id: key, prompt: `Press E to view ${name}'s card`, interact: () => store.openOverlay('peerCard', { id: peerId }) })
    }
  })
}

function RemotePlayer({ id, info }: { id: string; info: PeerInfo }) {
  const group = useRef<Group>(null)
  const [anim, setAnim] = useState<CharacterAnim>('idle')
  const placed = useRef(false)

  useFrame((_, delta) => {
    const g = group.current
    const st = peerStates.get(id)
    if (!g) return
    g.visible = !!st
    if (!st) return
    const [x, y, z] = st.p
    const feet = y - FEET
    // Ease towards the last reported position (updates arrive ~10×/s); jump on teleports.
    const far = Math.hypot(x - g.position.x, feet - g.position.y, z - g.position.z) > 5
    if (!placed.current || far) {
      g.position.set(x, feet, z)
      g.rotation.y = st.f
      placed.current = true
    } else {
      const k = 1 - Math.exp(-delta * 12)
      g.position.x += (x - g.position.x) * k
      g.position.y += (feet - g.position.y) * k
      g.position.z += (z - g.position.z) * k
      const turn = Math.atan2(Math.sin(st.f - g.rotation.y), Math.cos(st.f - g.rotation.y))
      g.rotation.y += turn * k
    }
    const next = ANIMS.has(st.a as CharacterAnim) ? (st.a as CharacterAnim) : 'idle'
    if (next !== anim) setAnim(next)
  })

  const emote = usePresence((s) => s.emotes[id])
  const waving = useRecent(emote?.key, EMOTE_MS) && emote?.e === 'wave'

  return (
    <group ref={group} visible={false}>
      <Suspense fallback={null}>
        <CharacterModel variant={info.avatar} animation={waving && anim === 'idle' ? 'wave' : anim} cullDistance={NPC_CULL_DISTANCE} castShadow={false} />
      </Suspense>
      <Billboard position={[0, 1.92, 0]}>
        <Suspense fallback={null}>
          <Text fontSize={0.15} color="#ffffff" outlineWidth={0.012} outlineColor="#0f172a" anchorX="center" anchorY="bottom" maxWidth={2.4}>
            {info.name}
          </Text>
          {info.tagline && (
            <Text position={[0, -0.03, 0]} fontSize={0.09} color="#bae6fd" outlineWidth={0.008} outlineColor="#0f172a" anchorX="center" anchorY="top" maxWidth={2.4}>
              {info.tagline}
            </Text>
          )}
        </Suspense>
      </Billboard>
      <Bubbles id={id} />
      <InteractPrompt id={`peer:${id}`} prompt={`Press E to view ${info.name}'s card`} position={[0, 2.75, 0]} />
    </group>
  )
}

/** True for `ms` after `key` changes (a new chat message / emote). */
function useRecent(key: number | undefined, ms: number) {
  const [recent, setRecent] = useState(false)
  useEffect(() => {
    if (!key || Date.now() - key > ms) return
    setRecent(true)
    const id = window.setTimeout(() => setRecent(false), ms - (Date.now() - key))
    return () => window.clearTimeout(id)
  }, [key, ms])
  return recent
}

/** Latest chat line and emote above a character's head. */
function Bubbles({ id, height = 2.45 }: { id: string; height?: number }) {
  const showChat = useSettings((s) => s.showChat)
  const message = usePresence((s) => {
    for (let i = s.chat.length - 1; i >= 0; i--) if (s.chat[i].id === id) return s.chat[i]
    return null
  })
  const emote = usePresence((s) => s.emotes[id])
  const chatOn = useRecent(message?.at, BUBBLE_MS) && showChat
  const emoteOn = useRecent(emote?.key, EMOTE_MS)
  if (!chatOn && !emoteOn) return null
  const emoji = EMOTES.find((e) => e.id === emote?.e)?.emoji
  return (
    <Html position={[0, height, 0]} center zIndexRange={[9, 0]} style={{ pointerEvents: 'none' }}>
      <div className="flex flex-col items-center gap-1">
        {emoteOn && emoji && <span className="animate-[prompt-in_200ms_ease-out] text-3xl drop-shadow">{emoji}</span>}
        {chatOn && message && (
          <span className="block w-max max-w-56 rounded-2xl bg-white px-3 py-1.5 text-center text-sm break-words whitespace-normal text-slate-900 shadow-lg animate-[prompt-in_150ms_ease-out]">
            {message.text}
          </span>
        )}
      </div>
    </Html>
  )
}

/** Your own emotes and chat above your head (the player model isn't part of RemotePlayers). */
function SelfEmote() {
  const group = useRef<Group>(null)
  useFrame(() => {
    const p = playerRuntime.position
    group.current?.position.set(p.x, p.y - FEET, p.z)
  })
  return (
    <group ref={group}>
      <Bubbles id="self" />
    </group>
  )
}
