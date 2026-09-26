import type { ReactNode } from 'react'
import { useGameStore } from '../../store/useGameStore'

const WIDTH = { md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-5xl' }

interface OverlayShellProps {
  title: string
  children: ReactNode
  size?: keyof typeof WIDTH
  /** 'light' keeps the 3D scene visible behind (e.g. the seated laptop view). */
  backdrop?: 'dim' | 'light'
  /** Text for the Esc hint, e.g. "to stand up". */
  escLabel?: string
}

/** Shared modal frame for every overlay: backdrop, title bar, close button. */
export function OverlayShell({ title, children, size = 'md', backdrop = 'dim', escLabel = 'to close' }: OverlayShellProps) {
  const closeOverlay = useGameStore((s) => s.closeOverlay)

  return (
    <div
      className={`pointer-events-auto fixed inset-0 z-50 flex items-center justify-center p-4 ${
        backdrop === 'dim' ? 'bg-slate-950/60 backdrop-blur-sm' : 'bg-slate-950/20'
      }`}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) closeOverlay()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-[88vh] w-full ${WIDTH[size]} flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl select-text animate-[prompt-in_180ms_ease-out]`}
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-500 sm:inline">
              <kbd className="rounded border border-slate-300 px-1 font-mono">Esc</kbd> {escLabel}
            </span>
            <button
              type="button"
              onClick={closeOverlay}
              className="rounded-lg px-2 py-1 text-xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </header>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}
