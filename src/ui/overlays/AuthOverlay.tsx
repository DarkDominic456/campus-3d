import { useState, type FormEvent } from 'react'
import { OverlayShell } from './OverlayShell'
import { Alert, Field, PrimaryButton, Tabs } from './controls'
import { AvatarPicker } from './AvatarPicker'
import { DEFAULT_AVATAR, useGameStore, type OverlayPropsMap } from '../../store/useGameStore'
import { auth, AuthError } from '../../services/auth'
import { email, minLength, required, validate } from '../../utils/validation'
import type { CharacterVariant } from '../../assets/models'

type Mode = 'login' | 'signup'

/** Gate booth: log in, sign up (with avatar), or manage the current account. */
export function AuthOverlay(props: OverlayPropsMap['auth']) {
  const user = useGameStore((s) => s.user)
  return (
    <OverlayShell title={user ? 'Your account' : 'Welcome to Campus'}>
      <AuthContent {...props} />
    </OverlayShell>
  )
}

/** Login / signup forms, or the account panel when signed in. `onDone` replaces "Start exploring". */
export function AuthContent({
  mode: initialMode = 'login',
  onDone,
  avatarPreview = true,
}: OverlayPropsMap['auth'] & { onDone?: () => void; avatarPreview?: boolean }) {
  const user = useGameStore((s) => s.user)
  const [mode, setMode] = useState<Mode>(initialMode)

  return (
    <>
      {user ? (
        <Account onDone={onDone} avatarPreview={avatarPreview} />
      ) : (
        <>
          <Tabs<Mode>
            value={mode}
            onChange={setMode}
            options={[
              { value: 'login', label: 'Log in' },
              { value: 'signup', label: 'Sign up' },
            ]}
          />
          {mode === 'login' ? <LogInForm /> : <SignUpForm avatarPreview={avatarPreview} />}
          <p className="mt-4 text-center text-xs text-slate-500">
            Just looking around? Close this panel to explore as a guest.
          </p>
        </>
      )}
    </>
  )
}

function LogInForm() {
  const setUser = useGameStore((s) => s.setUser)
  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof typeof values, string>>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const found = validate(values, { email: [required('Email'), email], password: [required('Password')] })
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    setServerError(null)
    try {
      setUser(await auth.logIn(values))
    } catch (err) {
      setServerError(err instanceof AuthError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {serverError && <Alert tone="error">{serverError}</Alert>}
      <Field label="Email" type="email" autoComplete="email" autoFocus value={values.email} error={errors.email}
        onChange={(e) => setValues({ ...values, email: e.target.value })} />
      <Field label="Password" type="password" autoComplete="current-password" value={values.password} error={errors.password}
        onChange={(e) => setValues({ ...values, password: e.target.value })} />
      <PrimaryButton type="submit" busy={busy}>Log in</PrimaryButton>
    </form>
  )
}

function SignUpForm({ avatarPreview }: { avatarPreview: boolean }) {
  const setUser = useGameStore((s) => s.setUser)
  const [values, setValues] = useState({ name: '', email: '', password: '' })
  const [avatar, setAvatar] = useState<CharacterVariant>(DEFAULT_AVATAR)
  const [errors, setErrors] = useState<Partial<Record<keyof typeof values, string>>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const found = validate(values, {
      name: [required('Name'), minLength('Name', 2)],
      email: [required('Email'), email],
      password: [required('Password'), minLength('Password', 6)],
    })
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    setServerError(null)
    try {
      setUser(await auth.signUp({ ...values, avatar }))
    } catch (err) {
      setServerError(err instanceof AuthError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {serverError && <Alert tone="error">{serverError}</Alert>}
      <Field label="Name" autoComplete="name" autoFocus value={values.name} error={errors.name}
        onChange={(e) => setValues({ ...values, name: e.target.value })} />
      <Field label="Email" type="email" autoComplete="email" value={values.email} error={errors.email}
        onChange={(e) => setValues({ ...values, email: e.target.value })} />
      <Field label="Password" type="password" autoComplete="new-password" value={values.password} error={errors.password}
        onChange={(e) => setValues({ ...values, password: e.target.value })} />
      <AvatarPicker value={avatar} onChange={setAvatar} preview={avatarPreview} />
      <PrimaryButton type="submit" busy={busy}>Create account</PrimaryButton>
    </form>
  )
}

function Account({ onDone, avatarPreview }: { onDone?: () => void; avatarPreview: boolean }) {
  const user = useGameStore((s) => s.user)!
  const setUser = useGameStore((s) => s.setUser)
  const closeOverlay = useGameStore((s) => s.closeOverlay)

  return (
    <div className="space-y-5">
      <Alert tone="success">
        Logged in as <strong>{user.name}</strong> ({user.email})
      </Alert>
      <AvatarPicker value={user.avatar} onChange={async (v) => setUser(await auth.updateAvatar(user, v))} preview={avatarPreview} />
      <div className="flex gap-3">
        <PrimaryButton type="button" onClick={onDone ?? closeOverlay}>
          {onDone ? 'Continue' : 'Start exploring'}
        </PrimaryButton>
        <button
          type="button"
          onClick={async () => {
            await auth.logOut()
            setUser(null)
          }}
          className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Log out
        </button>
      </div>
    </div>
  )
}
