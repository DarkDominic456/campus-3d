import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../store/useGameStore'
import { useSettings } from '../../settings/settings'
import { EMOTES, PRESENCE_MODE, sendChat, sendEmote, usePresence } from '../../multiplayer/presence'
import { isTypingTarget } from '../../utils/dom'

const VISIBLE_MS = 15_000

/**
 * Campus chat: recent messages, an input (Enter to open, Enter to send, Esc to cancel) and
 * emote buttons (keys 1–4). While the input is open, `chatOpen` locks movement so typing
 * "w" doesn't walk. Hidden when multiplayer is off or unavailable.
 */
export function ChatBox({ touch = false }: { touch?: boolean }) {
  const online = usePresence((s) => s.status === 'online')
  const showChat = useSettings((s) => s.showChat)
  const chat = usePresence((s) => s.chat)
  const open = useGameStore((s) => s.chatOpen)
  const setOpen = useGameStore((s) => s.setChatOpen)
  const [text, setText] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const input = useRef<HTMLInputElement>(null)

  // Re-render every few seconds so old messages fade out.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 3000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!online) return
    const onKeyDown = (e: KeyboardEvent) => {
      const s = useGameStore.getState()
      if (e.repeat || isTypingTarget(e.target) || s.activeOverlay || s.focus) return
      if (e.code === 'Enter' && useSettings.getState().showChat) {
        e.preventDefault()
        s.setChatOpen(true)
        return
      }
      const emote = EMOTES.find((em) => e.key === em.key)
      if (emote) sendEmote(emote.id)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [online])

  useEffect(() => {
    if (open) input.current?.focus()
  }, [open])

  // Leaving multiplayer closes the input (and unlocks movement).
  useEffect(() => {
    if (!online || !showChat) setOpen(false)
  }, [online, showChat, setOpen])

  if (!PRESENCE_MODE || !online) return null

  const close = () => {
    setText('')
    setOpen(false)
    input.current?.blur()
  }
  const recent = showChat ? chat.filter((m) => open || now - m.at < VISIBLE_MS).slice(open ? -8 : -4) : []

  return (
    <div className={`pointer-events-none flex flex-col gap-1.5 ${touch ? 'w-64' : 'w-80'}`}>
      {recent.length > 0 && (
        <ul className="space-y-1" aria-live="polite" aria-label="Chat messages">
          {recent.map((m) => (
            <li key={m.key} className="w-fit max-w-full rounded-lg bg-slate-900/70 px-2.5 py-1 text-sm text-white shadow backdrop-blur break-words">
              <span className={`font-semibold ${m.id === 'self' ? 'text-emerald-300' : 'text-sky-300'}`}>{m.name}:</span> {m.text}
            </li>
          ))}
        </ul>
      )}
      {open ? (
        <form
          className="pointer-events-auto"
          onSubmit={(e) => {
            e.preventDefault()
            sendChat(text)
            close()
          }}
        >
          <input
            ref={input}
            value={text}
            maxLength={200}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                e.stopPropagation()
                close()
              }
            }}
            onBlur={() => !text && close()}
            placeholder="Say something… (Enter to send, Esc to cancel)"
            aria-label="Chat message"
            className="w-full rounded-lg bg-white/95 px-3 py-2 text-sm text-slate-900 shadow-lg outline-none ring-2 ring-sky-400"
          />
        </form>
      ) : (
        <div className="pointer-events-auto flex items-center gap-1">
          {showChat && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-full bg-slate-900/75 px-3 py-1.5 text-xs font-medium text-white shadow-lg ring-1 ring-white/15 backdrop-blur hover:bg-slate-800"
            >
              💬 Chat {!touch && <kbd className="ml-1 rounded bg-white/90 px-1 font-mono text-[10px] font-bold text-slate-900">Enter</kbd>}
            </button>
          )}
          {EMOTES.map((em) => (
            <button
              key={em.id}
              type="button"
              onClick={() => sendEmote(em.id)}
              title={`${em.label}${touch ? '' : ` (${em.key})`}`}
              aria-label={em.label}
              className="flex size-8 items-center justify-center rounded-full bg-slate-900/75 text-base shadow-lg ring-1 ring-white/15 backdrop-blur hover:bg-slate-800"
            >
              {em.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
