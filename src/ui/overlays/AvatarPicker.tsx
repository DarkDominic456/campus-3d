import { lazy, Suspense } from 'react'
import { CHARACTERS, type CharacterVariant } from '../../assets/models'

const AvatarPreview = lazy(() => import('./AvatarPreview'))

const label = (v: CharacterVariant) => `Avatar ${CHARACTERS.indexOf(v) + 1}`

/**
 * Grid of avatar buttons plus (optionally) a live 3D preview of the selected one.
 * The 2D site passes `preview={false}` so it stays free of three.js.
 */
export function AvatarPicker({
  value,
  onChange,
  preview = true,
}: {
  value: CharacterVariant
  onChange: (v: CharacterVariant) => void
  preview?: boolean
}) {
  return (
    <div className="flex gap-4">
      {preview && (
        <div className="h-40 w-32 shrink-0 overflow-hidden rounded-xl bg-gradient-to-b from-sky-100 to-sky-200" aria-hidden>
          <Suspense fallback={null}>
            <AvatarPreview variant={value} />
          </Suspense>
        </div>
      )}
      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Choose your avatar</p>
        <div role="radiogroup" aria-label="Avatar" className="grid grid-cols-4 gap-1.5">
          {CHARACTERS.map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={v === value}
              onClick={() => onChange(v)}
              className={`rounded-md border px-2 py-1 text-xs font-medium transition ${
                v === value ? 'border-sky-500 bg-sky-50 text-sky-800' : 'border-slate-200 text-slate-600 hover:border-slate-400'
              }`}
            >
              {CHARACTERS.indexOf(v) + 1}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">{label(value)}</p>
      </div>
    </div>
  )
}
