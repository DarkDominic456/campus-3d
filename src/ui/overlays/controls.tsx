import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'

/** Labelled text input with an inline error. */
export function Field({
  label,
  error,
  multiline,
  ...props
}: {
  label: string
  error?: string
  multiline?: boolean
} & InputHTMLAttributes<HTMLInputElement> &
  TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  const errorId = `${id}-error`
  const className = `w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2 ${
    error ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:border-sky-500 focus:ring-sky-100'
  }`
  const shared = { id, 'aria-invalid': !!error, 'aria-describedby': error ? errorId : undefined, className }

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {multiline ? <textarea rows={4} {...props} {...shared} /> : <input {...props} {...shared} />}
      {error && (
        <p id={errorId} className="mt-1 text-xs text-rose-600">
          {error}
        </p>
      )}
    </div>
  )
}

export function PrimaryButton({ children, busy, ...props }: { busy?: boolean; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      disabled={busy || props.disabled}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy && <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />}
      {children}
    </button>
  )
}

/** Simple segmented tabs. */
export function Tabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div role="tablist" className="mb-5 inline-flex rounded-lg bg-slate-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
            value === o.value ? 'bg-white text-slate-900 shadow' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Alert({ tone, children }: { tone: 'error' | 'success'; children: ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-lg px-3 py-2 text-sm ${tone === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800'}`}
    >
      {children}
    </div>
  )
}
