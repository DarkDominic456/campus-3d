import { Html } from '@react-three/drei'
import type { Vector3Tuple } from 'three'
import { selectActiveInteractable, useGameStore } from '../store/useGameStore'

/** Floating "Press E to …" bubble, visible only for the interactable E would trigger. */
export function InteractPrompt({ id, prompt, position }: { id: string; prompt: string; position: Vector3Tuple }) {
  const isActive = useGameStore((s) => selectActiveInteractable(s)?.id === id)
  const busy = useGameStore((s) => s.activeOverlay !== null || s.focus !== null)
  if (!isActive || busy) return null

  const [head, ...rest] = prompt.split(/\bE\b/)
  return (
    <Html position={position} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
      <div className="whitespace-nowrap rounded-full bg-slate-900/85 px-4 py-2 text-sm font-medium text-white shadow-lg ring-1 ring-white/20 backdrop-blur animate-[prompt-in_150ms_ease-out]">
        {rest.length > 0 ? (
          <>
            {head}
            <kbd className="mx-1 rounded bg-white px-1.5 py-0.5 font-mono text-xs font-bold text-slate-900">E</kbd>
            {rest.join('E')}
          </>
        ) : (
          prompt
        )}
      </div>
    </Html>
  )
}
