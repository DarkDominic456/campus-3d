import { useEffect, useRef, useState, type FormEvent } from 'react'
import { OverlayShell } from './OverlayShell'
import { Alert, Field, PrimaryButton } from './controls'
import { AvatarPicker } from './AvatarPicker'
import { useGameStore } from '../../store/useGameStore'
import { auth, AuthError, displayName, type Profile, type User } from '../../services/auth'
import { email, matches, maxLength, password, phone, required, validate } from '../../utils/validation'
import { fileToSquareJpeg, ImageError } from '../../utils/image'
import { SPOTS } from '../../world/layout'
import type { ProfileLink } from './AuthOverlay'

const LIMITS = { displayName: 60, tagline: 80, location: 80, about: 500, careerSummary: 1000 } as const

/** Office profile desk (3D). Guests are sent to the gate to sign up first. */
export function ProfileOverlay() {
  const toGate: ProfileLink = {
    label: 'Take me to the gate',
    onClick: () => {
      const s = useGameStore.getState()
      s.requestTeleport(SPOTS.gateBooth.position, SPOTS.gateBooth.facing)
      s.closeOverlay()
    },
  }
  return (
    <OverlayShell title="Your profile" size="lg">
      <ProfileContent needAccount={toGate} guardClose />
    </OverlayShell>
  )
}

/**
 * Profile editor shared by the 3D overlay and the 2D `#/profile` page.
 * `guardClose` asks before an overlay with unsaved changes is closed.
 */
export function ProfileContent({
  needAccount,
  guardClose = false,
  avatarPreview = true,
}: {
  needAccount: ProfileLink
  guardClose?: boolean
  avatarPreview?: boolean
}) {
  const user = useGameStore((s) => s.user)
  if (!user) {
    return (
      <div className="py-6 text-center">
        <p className="text-lg font-semibold">Create an account first</p>
        <p className="mt-1 text-slate-600">Sign up with your email at the main gate, then come back to set up your profile.</p>
        <div className="mx-auto mt-5 max-w-xs">
          <PrimaryButton type="button" onClick={needAccount.onClick}>{needAccount.label}</PrimaryButton>
        </div>
      </div>
    )
  }
  return <ProfileEditor key={user.id} user={user} guardClose={guardClose} avatarPreview={avatarPreview} />
}

function ProfileEditor({ user, guardClose, avatarPreview }: { user: User; guardClose: boolean; avatarPreview: boolean }) {
  const setUser = useGameStore((s) => s.setUser)
  const setCloseGuard = useGameStore((s) => s.setCloseGuard)
  const [values, setValues] = useState<Profile>(user.profile)
  const [errors, setErrors] = useState<Partial<Record<keyof Profile, string>>>({})
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const dirty = JSON.stringify(values) !== JSON.stringify(user.profile)

  // Ask before closing the overlay with unsaved edits.
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty
  useEffect(() => {
    if (!guardClose) return
    setCloseGuard(() => !dirtyRef.current || window.confirm('You have unsaved profile changes. Close without saving?'))
    return () => setCloseGuard(null)
  }, [guardClose, setCloseGuard])

  const set = (key: keyof Profile) => (e: { target: { value: string } }) => {
    setValues((v) => ({ ...v, [key]: e.target.value }))
    setStatus(null)
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }))
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    const found = validate(values, {
      displayName: [required('Name'), maxLength('Name', LIMITS.displayName)],
      phone: [phone],
      tagline: [maxLength('Tagline', LIMITS.tagline)],
      location: [maxLength('Location', LIMITS.location)],
      about: [maxLength('About', LIMITS.about)],
      careerSummary: [maxLength('Career summary', LIMITS.careerSummary)],
    })
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      const trimmed = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, k === 'photo' ? v : v.trim()])) as unknown as Profile
      const updated = await auth.updateProfile(user, trimmed)
      setUser(updated)
      setValues(updated.profile)
      setStatus({ tone: 'success', text: 'Profile saved.' })
    } catch (err) {
      setStatus({ tone: 'error', text: err instanceof AuthError ? err.message : 'Could not save your profile. Please try again.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="space-y-5">
        <ProfileCard user={user} profile={values} />
        <PhotoPicker photo={values.photo} onChange={(photo) => setValues((v) => ({ ...v, photo }))} />
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">3D character</p>
          <AvatarPicker value={user.avatar} preview={avatarPreview}
            onChange={async (v) => setUser(await auth.updateAvatar(user, v))} />
        </div>
      </aside>

      <div className="space-y-6">
        <form onSubmit={save} noValidate className="space-y-4" aria-label="Profile details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" autoComplete="name" value={values.displayName} error={errors.displayName} onChange={set('displayName')} maxLength={LIMITS.displayName} />
            <Field label="Contact number" type="tel" autoComplete="tel" inputMode="tel" placeholder="+91 98765 43210"
              value={values.phone} error={errors.phone} onChange={set('phone')} />
            <Field label="Tagline" placeholder="e.g. Frontend developer · Lifelong learner" value={values.tagline} error={errors.tagline}
              onChange={set('tagline')} maxLength={LIMITS.tagline} />
            <Field label="Location" autoComplete="address-level2" placeholder="City, Country" value={values.location} error={errors.location}
              onChange={set('location')} maxLength={LIMITS.location} />
          </div>
          <Counted label="About you" value={values.about} limit={LIMITS.about} error={errors.about} onChange={set('about')} />
          <Counted label="Career summary" value={values.careerSummary} limit={LIMITS.careerSummary} error={errors.careerSummary}
            onChange={set('careerSummary')} />
          {status && <Alert tone={status.tone}>{status.text}</Alert>}
          <div className="flex items-center gap-3">
            <div className="w-40">
              <PrimaryButton type="submit" busy={busy} disabled={!dirty}>Save profile</PrimaryButton>
            </div>
            {dirty && <span className="text-xs text-amber-700">Unsaved changes</span>}
          </div>
        </form>

        <AccountSection user={user} />
      </div>
    </div>
  )
}

function Counted({ label, value, limit, error, onChange }: { label: string; value: string; limit: number; error?: string; onChange: (e: { target: { value: string } }) => void }) {
  return (
    <div>
      <Field label={label} multiline value={value} error={error} onChange={onChange} maxLength={limit} />
      <p className="mt-1 text-right text-xs text-slate-400">{value.length}/{limit}</p>
    </div>
  )
}

/** Live preview of how the profile looks to others. */
function ProfileCard({ user, profile }: { user: User; profile: Profile }) {
  const name = profile.displayName.trim() || displayName(user)
  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 p-4 text-white shadow">
      <div className="flex items-center gap-3">
        {profile.photo ? (
          <img src={profile.photo} alt="Profile photo" className="size-16 rounded-full object-cover ring-2 ring-white/70" />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-full bg-white/20 text-2xl font-bold ring-2 ring-white/50">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{name}</p>
          {profile.tagline && <p className="truncate text-sm text-sky-100">{profile.tagline}</p>}
          {profile.location && <p className="truncate text-xs text-sky-200">{profile.location}</p>}
        </div>
      </div>
    </div>
  )
}

function PhotoPicker({ photo, onChange }: { photo: string; onChange: (photo: string) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const pick = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      onChange(await fileToSquareJpeg(file))
    } catch (err) {
      setError(err instanceof ImageError ? err.message : "Couldn't use that image.")
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-700">Photo</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => input.current?.click()} disabled={busy}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-60">
          {busy ? 'Processing…' : photo ? 'Change photo' : 'Upload photo'}
        </button>
        {photo && (
          <button type="button" onClick={() => onChange('')} className="rounded-lg px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50">
            Remove
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" className="hidden" aria-label="Upload profile photo"
        onChange={(e) => pick(e.target.files?.[0])} />
      <p className="mt-1 text-xs text-slate-500">JPG or PNG, up to 5 MB. Cropped to a square.</p>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  )
}

/** Email (prefilled from signup) and password (masked, never shown) with change flows. */
function AccountSection({ user }: { user: User }) {
  const [open, setOpen] = useState<'email' | 'password' | null>(null)
  return (
    <section className="rounded-2xl border border-slate-200 p-4" aria-label="Login details">
      <h3 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">Login details</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <ReadOnly label="Email" value={user.email} action={open === 'email' ? 'Cancel' : 'Change'} onAction={() => setOpen(open === 'email' ? null : 'email')} />
        <ReadOnly label="Password" value="••••••••••" action={open === 'password' ? 'Cancel' : 'Change password'}
          onAction={() => setOpen(open === 'password' ? null : 'password')} />
      </div>
      {open === 'email' && <ChangeEmail user={user} onDone={() => setOpen(null)} />}
      {open === 'password' && <ChangePassword user={user} onDone={() => setOpen(null)} />}
      <LogOut />
    </section>
  )
}

function ReadOnly({ label, value, action, onAction }: { label: string; value: string; action: string; onAction: () => void }) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-slate-700">{label}</p>
      <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
        <span className="truncate" aria-label={label}>{value}</span>
        <button type="button" onClick={onAction} className="shrink-0 text-xs font-semibold text-sky-700 hover:underline">{action}</button>
      </div>
    </div>
  )
}

function ChangeEmail({ user, onDone }: { user: User; onDone: () => void }) {
  const setUser = useGameStore((s) => s.setUser)
  const [values, setValues] = useState({ email: user.email, password: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof typeof values, string>>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const found = validate(values, { email: [required('Email'), email], password: [required('Current password')] })
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      setUser(await auth.changeEmail(user, values.email, values.password))
      onDone()
    } catch (err) {
      setServerError(err instanceof AuthError ? err.message : 'Could not change your email.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-4 grid gap-3 sm:grid-cols-2" aria-label="Change email">
      {serverError && <div className="sm:col-span-2"><Alert tone="error">{serverError}</Alert></div>}
      <Field label="New email" type="email" autoComplete="email" value={values.email} error={errors.email}
        onChange={(e) => setValues({ ...values, email: e.target.value })} />
      <Field label="Current password" type="password" autoComplete="current-password" value={values.password} error={errors.password}
        onChange={(e) => setValues({ ...values, password: e.target.value })} />
      <div className="sm:col-span-2 sm:w-48"><PrimaryButton type="submit" busy={busy}>Update email</PrimaryButton></div>
    </form>
  )
}

function ChangePassword({ user, onDone }: { user: User; onDone: () => void }) {
  const [values, setValues] = useState({ current: '', next: '', confirm: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof typeof values, string>>>({})
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const found = validate(values, {
      current: [required('Current password')],
      next: [required('New password'), password],
      confirm: [required('Confirm password'), matches(values.next, 'Passwords do not match.')],
    })
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      await auth.changePassword(user, values.current, values.next)
      setMessage({ tone: 'success', text: 'Password changed.' })
      setValues({ current: '', next: '', confirm: '' })
      window.setTimeout(onDone, 1200)
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof AuthError ? err.message : 'Could not change your password.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-4 grid gap-3 sm:grid-cols-3" aria-label="Change password">
      {message && <div className="sm:col-span-3"><Alert tone={message.tone}>{message.text}</Alert></div>}
      <Field label="Current password" type="password" autoComplete="current-password" value={values.current} error={errors.current}
        onChange={(e) => setValues({ ...values, current: e.target.value })} />
      <Field label="New password" type="password" autoComplete="new-password" value={values.next} error={errors.next}
        onChange={(e) => setValues({ ...values, next: e.target.value })} />
      <Field label="Confirm new password" type="password" autoComplete="new-password" value={values.confirm} error={errors.confirm}
        onChange={(e) => setValues({ ...values, confirm: e.target.value })} />
      <div className="sm:col-span-3 sm:w-48"><PrimaryButton type="submit" busy={busy}>Change password</PrimaryButton></div>
    </form>
  )
}

function LogOut() {
  const setUser = useGameStore((s) => s.setUser)
  return (
    <button type="button"
      onClick={async () => {
        await auth.logOut()
        setUser(null)
      }}
      className="mt-4 text-sm font-medium text-slate-500 hover:text-slate-800 hover:underline">
      Log out
    </button>
  )
}
