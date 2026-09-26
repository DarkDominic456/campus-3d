import { useState, type FormEvent } from 'react'
import { OverlayShell } from './OverlayShell'
import { Alert, Field, PrimaryButton, Tabs } from './controls'
import { useGameStore, type OverlayPropsMap } from '../../store/useGameStore'
import { auth, AuthError, displayName } from '../../services/auth'
import { email, matches, password, required, validate } from '../../utils/validation'
import { SPOTS } from '../../world/layout'

type Mode = 'login' | 'signup'

/** Where "complete your profile" sends the user: 3D walks them to the office desk, 2D links a page. */
export interface ProfileLink {
  label: string
  onClick: () => void
}

/** Gate booth (3D): log in or sign up. The profile link teleports to the office profile desk. */
export function AuthOverlay(props: OverlayPropsMap['auth']) {
  const user = useGameStore((s) => s.user)
  const toProfileDesk: ProfileLink = {
    label: 'Take me to the Office',
    onClick: () => {
      const s = useGameStore.getState()
      s.requestTeleport(SPOTS.profileDesk.position, SPOTS.profileDesk.facing)
      s.closeOverlay()
    },
  }
  return (
    <OverlayShell title={user ? 'Your account' : 'Welcome to Campus'}>
      <AuthContent {...props} profileLink={toProfileDesk} />
    </OverlayShell>
  )
}

/** Login / signup forms, or a small account panel when signed in. Shared with the 2D site. */
export function AuthContent({
  mode: initialMode = 'login',
  onDone,
  profileLink,
}: OverlayPropsMap['auth'] & { onDone?: () => void; profileLink: ProfileLink }) {
  const user = useGameStore((s) => s.user)
  const [mode, setMode] = useState<Mode>(initialMode)
  const [justSignedUp, setJustSignedUp] = useState(false)

  if (user) return <Account onDone={onDone} profileLink={profileLink} welcome={justSignedUp} />
  return (
    <>
      <Tabs<Mode>
        value={mode}
        onChange={setMode}
        options={[
          { value: 'login', label: 'Log in' },
          { value: 'signup', label: 'Sign up' },
        ]}
      />
      {mode === 'login' ? <LogInForm /> : <SignUpForm onCreated={() => setJustSignedUp(true)} />}
      <p className="mt-4 text-center text-xs text-slate-500">Just looking around? Close this panel to explore as a guest.</p>
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

/** Email + password + confirm only — name, photo and the rest live in the profile. */
function SignUpForm({ onCreated }: { onCreated: () => void }) {
  const setUser = useGameStore((s) => s.setUser)
  const [values, setValues] = useState({ email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof typeof values, string>>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const found = validate(values, {
      email: [required('Email'), email],
      password: [required('Password'), password],
      confirm: [required('Confirm password'), matches(values.password, 'Passwords do not match.')],
    })
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    setServerError(null)
    try {
      const user = await auth.signUp({ email: values.email, password: values.password })
      onCreated()
      setUser(user)
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
      <Field label="Password" type="password" autoComplete="new-password" value={values.password} error={errors.password}
        onChange={(e) => setValues({ ...values, password: e.target.value })} />
      <p className="-mt-2 text-xs text-slate-500">At least 8 characters, with a letter and a number.</p>
      <Field label="Confirm password" type="password" autoComplete="new-password" value={values.confirm} error={errors.confirm}
        onChange={(e) => setValues({ ...values, confirm: e.target.value })} />
      <PrimaryButton type="submit" busy={busy}>Create account</PrimaryButton>
    </form>
  )
}

function Account({ onDone, profileLink, welcome }: { onDone?: () => void; profileLink: ProfileLink; welcome: boolean }) {
  const user = useGameStore((s) => s.user)!
  const setUser = useGameStore((s) => s.setUser)
  const closeOverlay = useGameStore((s) => s.closeOverlay)
  const hasProfile = !!user.profile.displayName

  return (
    <div className="space-y-5">
      {welcome ? (
        <Alert tone="success">
          Account created for <strong>{user.email}</strong>. Visit the <strong>Office</strong> (first floor) to set up your profile —
          name, photo, contact and more.
        </Alert>
      ) : (
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
          {user.profile.photo ? (
            <img src={user.profile.photo} alt="" className="size-12 rounded-full object-cover" />
          ) : (
            <div className="flex size-12 items-center justify-center rounded-full bg-sky-100 text-lg font-bold text-sky-700">
              {displayName(user).charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold">{displayName(user)}</p>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <PrimaryButton type="button" onClick={profileLink.onClick}>
          {welcome || !hasProfile ? profileLink.label : 'Edit profile'}
        </PrimaryButton>
        <button type="button" onClick={onDone ?? closeOverlay}
          className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          {onDone ? 'Continue' : 'Keep exploring'}
        </button>
        <button type="button"
          onClick={async () => {
            await auth.logOut()
            setUser(null)
          }}
          className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Log out
        </button>
      </div>
    </div>
  )
}
