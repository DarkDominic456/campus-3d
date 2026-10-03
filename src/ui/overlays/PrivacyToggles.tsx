import { useSettings } from '../../settings/settings'
import { useGameStore } from '../../store/useGameStore'

/** Multiplayer privacy switches (People panel, Settings). */
export function PrivacyToggles() {
  const { showPresence, shareCard, showChat, set } = useSettings()
  const loggedIn = useGameStore((s) => s.user !== null)
  return (
    <div className="space-y-3">
      <Switch
        label="Show me to other visitors"
        hint="Others see your character, name and tagline while you're here. Off = you're hidden and you won't see them either."
        checked={showPresence}
        onChange={(on) => set({ showPresence: on })}
      />
      <Switch
        label="Share my profile card"
        hint={
          loggedIn
            ? 'Adds your photo, location and about to your card. Your phone number and email are never shared.'
            : 'Log in at the gate to share a profile card.'
        }
        checked={shareCard && loggedIn}
        disabled={!loggedIn || !showPresence}
        onChange={(on) => set({ shareCard: on })}
      />
      <Switch label="Show chat" hint="Chat messages and speech bubbles from other visitors." checked={showChat} onChange={(on) => set({ showChat: on })} />
    </div>
  )
}

function Switch({ label, hint, checked, disabled, onChange }: { label: string; hint: string; checked: boolean; disabled?: boolean; onChange: (on: boolean) => void }) {
  return (
    <div className={`flex items-start justify-between gap-3 ${disabled ? 'opacity-50' : ''}`}>
      <div>
        <p className="text-sm text-slate-700">{label}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-sky-500' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${checked ? 'left-5.5' : 'left-0.5'}`} />
      </button>
    </div>
  )
}
