import type { ReactNode } from 'react'
import { OverlayShell } from './OverlayShell'
import { useSettings, type TimeOfDaySetting } from '../../settings/settings'
import { useGameStore } from '../../store/useGameStore'
import { useTourStore } from '../../tour/tour'
import { playSound } from '../../audio/audio'

const TIMES: { value: TimeOfDaySetting; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'sunset', label: 'Sunset' },
  { value: 'night', label: 'Night' },
  { value: 'auto', label: 'My clock' },
]

/** HUD → Settings: sound, ambience, time of day, campus tour. */
export function SettingsOverlay() {
  const { muted, volume, ambience, timeOfDay, set } = useSettings()
  const restartTour = useTourStore((s) => s.restart)
  const tourActive = useTourStore((s) => s.active)

  return (
    <OverlayShell title="Settings">
      <div className="space-y-6">
        <Section title="Sound">
          <Toggle
            label="Sound effects and music"
            checked={!muted}
            onChange={(on) => {
              set({ muted: !on })
              if (on) playSound('ui-toggle')
            }}
          />
          <label className="mt-3 block text-sm text-slate-700">
            <span className="flex justify-between">
              Volume <span className="text-slate-500 tabular-nums">{Math.round(volume * 100)}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              disabled={muted}
              onChange={(e) => set({ volume: Number(e.target.value) })}
              onPointerUp={() => playSound('ui-click')}
              className="mt-1 w-full accent-sky-500 disabled:opacity-40"
              aria-label="Volume"
            />
          </label>
          <div className="mt-3">
            <Toggle label="Nature ambience (birds, wind, crickets)" checked={ambience} disabled={muted} onChange={(on) => set({ ambience: on })} />
          </div>
        </Section>

        <Section title="Time of day">
          <div role="radiogroup" aria-label="Time of day" className="grid grid-cols-4 gap-1.5">
            {TIMES.map((t) => (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={timeOfDay === t.value}
                onClick={() => {
                  set({ timeOfDay: t.value })
                  playSound('ui-click')
                }}
                className={`rounded-lg border px-2 py-1.5 text-sm font-medium transition ${
                  timeOfDay === t.value ? 'border-sky-500 bg-sky-50 text-sky-800' : 'border-slate-200 text-slate-600 hover:border-slate-400'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">"My clock" follows your local time: day 6–17 h, sunset until 19:30, then night.</p>
        </Section>

        <Section title="Campus tour">
          <p className="text-sm text-slate-600">A short guided walk: sign up, sit in class, play a game and a sport, set up your profile, watch the presentation.</p>
          <button
            type="button"
            onClick={() => {
              restartTour()
              useGameStore.getState().closeOverlay()
            }}
            className="mt-3 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
          >
            {tourActive ? 'Restart the tour' : 'Start the tour'}
          </button>
        </Section>
      </div>
    </OverlayShell>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">{title}</h3>
      {children}
    </section>
  )
}

function Toggle({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className={`flex items-center justify-between gap-3 text-sm text-slate-700 ${disabled ? 'opacity-40' : ''}`}>
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-sky-500' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${checked ? 'left-5.5' : 'left-0.5'}`} />
      </button>
    </label>
  )
}
