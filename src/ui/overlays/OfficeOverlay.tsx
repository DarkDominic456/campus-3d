import { useState, type FormEvent } from 'react'
import { OverlayShell } from './OverlayShell'
import { Alert, Field, PrimaryButton, Tabs } from './controls'
import { useGameStore, type OverlayPropsMap } from '../../store/useGameStore'
import { submitDemoRequest, type DemoRequest } from '../../services/forms'
import { email, maxLength, minLength, required, validate } from '../../utils/validation'
import { PLANS } from '../../content/pricing'
import { displayName } from '../../services/auth'

type Tab = 'demo' | 'pricing'

/** Office reception: "Request a Demo" form and "View Pricing" cards. */
export function OfficeOverlay(props: OverlayPropsMap['office']) {
  return (
    <OverlayShell title="Reception" size="lg">
      <OfficeContent {...props} />
    </OverlayShell>
  )
}

export function OfficeContent({ tab: initialTab = 'demo' }: OverlayPropsMap['office']) {
  const [tab, setTab] = useState<Tab>(initialTab)
  return (
    <>
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'demo', label: 'Request a Demo' },
          { value: 'pricing', label: 'View Pricing' },
        ]}
      />
      {tab === 'demo' ? <DemoForm /> : <Pricing onRequestDemo={() => setTab('demo')} />}
    </>
  )
}

const RULES = {
  name: [required('Name'), minLength('Name', 2), maxLength('Name', 80)],
  email: [required('Email'), email],
  organization: [required('Organization'), maxLength('Organization', 120)],
  message: [required('Message'), minLength('Message', 10), maxLength('Message', 1000)],
}

export function DemoForm() {
  const user = useGameStore((s) => s.user)
  const [values, setValues] = useState<DemoRequest>({
    name: user?.profile.displayName ?? '',
    email: user?.email ?? '',
    organization: '',
    message: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof DemoRequest, string>>>({})
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ reference: string } | null>(null)
  const [failed, setFailed] = useState(false)

  const set = (key: keyof DemoRequest) => (e: { target: { value: string } }) => {
    setValues({ ...values, [key]: e.target.value })
    if (errors[key]) setErrors({ ...errors, [key]: undefined })
  }
  // Re-check a single field when it loses focus, so errors show before submit.
  const check = (key: keyof DemoRequest) => () => setErrors({ ...errors, [key]: validate(values, { [key]: RULES[key] })[key] })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const found = validate(values, RULES)
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    setFailed(false)
    try {
      setResult(await submitDemoRequest(values))
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  if (result) {
    return (
      <div className="space-y-3 py-6 text-center">
        <div className="text-4xl" aria-hidden>🎉</div>
        <h3 className="text-xl font-bold">Thanks, {values.name.split(' ')[0]}!</h3>
        <p className="text-slate-600">
          We&apos;ve received your request and will reach out at <strong>{values.email}</strong> within one business day.
        </p>
        <p className="text-xs text-slate-500">Reference: {result.reference}</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      {failed && (
        <div className="sm:col-span-2">
          <Alert tone="error">We couldn&apos;t send your request. Please try again.</Alert>
        </div>
      )}
      <Field label="Name" autoComplete="name" value={values.name} error={errors.name} onChange={set('name')} onBlur={check('name')} />
      <Field label="Work email" type="email" autoComplete="email" value={values.email} error={errors.email} onChange={set('email')} onBlur={check('email')} />
      <div className="sm:col-span-2">
        <Field label="Organization" autoComplete="organization" value={values.organization} error={errors.organization}
          onChange={set('organization')} onBlur={check('organization')} />
      </div>
      <div className="sm:col-span-2">
        <Field label="What would you like to see?" multiline value={values.message} error={errors.message}
          onChange={set('message')} onBlur={check('message')} maxLength={1000} />
        <p className="mt-1 text-right text-xs text-slate-400">{values.message.length}/1000</p>
      </div>
      <div className="sm:col-span-2">
        <PrimaryButton type="submit" busy={busy}>{busy ? 'Sending…' : 'Request a demo'}</PrimaryButton>
      </div>
    </form>
  )
}

export function Pricing({ onRequestDemo }: { onRequestDemo: () => void }) {
  const user = useGameStore((s) => s.user)
  const openOverlay = useGameStore((s) => s.openOverlay)

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {PLANS.map((plan) => (
        <article
          key={plan.id}
          className={`flex flex-col rounded-2xl border p-5 ${plan.highlighted ? 'border-sky-500 shadow-lg ring-1 ring-sky-500' : 'border-slate-200'}`}
        >
          {plan.highlighted && (
            <span className="mb-2 self-start rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">Most popular</span>
          )}
          <h3 className="text-lg font-bold">{plan.name}</h3>
          <p className="mt-1 text-sm text-slate-500">{plan.tagline}</p>
          <p className="mt-4">
            <span className="text-3xl font-extrabold">{plan.price}</span>
            {plan.period && <span className="text-sm text-slate-500"> {plan.period}</span>}
          </p>
          <ul className="mt-4 flex-1 space-y-1.5 text-sm">
            {plan.features.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-emerald-600" aria-hidden>✓</span>
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-5">
            {plan.cta === 'demo' ? (
              <PrimaryButton type="button" onClick={onRequestDemo}>Request a demo</PrimaryButton>
            ) : user ? (
              <p className="text-center text-sm text-slate-500">You&apos;re signed in as {displayName(user)}</p>
            ) : (
              <PrimaryButton type="button" onClick={() => openOverlay('auth', { mode: 'signup' })}>Sign up</PrimaryButton>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}
