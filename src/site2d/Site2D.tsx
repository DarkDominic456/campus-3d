import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useModeStore } from '../mode/mode'
import { useGameStore } from '../store/useGameStore'
import { COURSES } from '../content/courses'
import { LearningContent } from '../ui/overlays/LearningOverlay'
import { ArcadeContent } from '../ui/overlays/ArcadeOverlay'
import { DemoForm, Pricing } from '../ui/overlays/OfficeOverlay'
import { AuthContent } from '../ui/overlays/AuthOverlay'
import { ProfileContent } from '../ui/overlays/ProfileOverlay'
import { displayName } from '../services/auth'
import { SlideDeck } from '../ui/slides/SlideDeck'
import { GAMES, gameMeta, type GameId } from '../minigames/registry'
import { SessionsContent } from '../ui/sessions/SessionsContent'

const ROUTES = ['home', 'learn', 'games', 'sessions', 'about', 'pricing', 'contact', 'account', 'profile'] as const
type Route = (typeof ROUTES)[number]

const NAV: { route: Route; label: string }[] = [
  { route: 'learn', label: 'Learn' },
  { route: 'games', label: 'Games' },
  { route: 'sessions', label: 'Sessions' },
  { route: 'about', label: 'About' },
  { route: 'pricing', label: 'Pricing' },
  { route: 'contact', label: 'Request a demo' },
]

// ---- Tiny hash router (#/learn) — no dependency, works on any static host. ----
const readRoute = (): Route => {
  const r = location.hash.replace(/^#\/?/, '') as Route
  return ROUTES.includes(r) ? r : 'home'
}
const subscribe = (fn: () => void) => {
  window.addEventListener('hashchange', fn)
  return () => window.removeEventListener('hashchange', fn)
}
export const navigate = (route: Route) => {
  location.hash = route === 'home' ? '/' : `/${route}`
}

/**
 * The 2D version of the site: the same content as the 3D campus (courses, arcade games,
 * about/team slides, pricing, demo form, account) as ordinary responsive web pages.
 * Nothing here imports three.js.
 */
export function Site2D() {
  const route = useSyncExternalStore(subscribe, readRoute)
  useEffect(() => {
    // Braces matter: newer browsers return a Promise from scrollTo, which React would treat as a cleanup.
    window.scrollTo(0, 0)
  }, [route])

  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      <Header route={route} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        {route === 'home' && <Home />}
        {route === 'learn' && (
          <Page title="Learn" intro="The courses from the campus classrooms. Pick a course and work through its lessons.">
            <LearningContent />
          </Page>
        )}
        {route === 'games' && <Games />}
        {route === 'sessions' && (
          <Page title="Sessions" intro="Talks, workshops and meetups from the campus conference room — join from anywhere.">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <SessionsContent inlineVideo />
            </div>
          </Page>
        )}
        {route === 'about' && <About />}
        {route === 'pricing' && (
          <Page title="Pricing" intro="Simple plans for learners, and custom campuses for teams and schools.">
            <Pricing onRequestDemo={() => navigate('contact')} />
          </Page>
        )}
        {route === 'contact' && (
          <Page title="Request a demo" intro="Tell us about your organization and what you'd like to see — we'll get back within one business day.">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <DemoForm />
            </div>
          </Page>
        )}
        {route === 'account' && <Account />}
        {route === 'profile' && <ProfilePage />}
      </main>
      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-500">
        Campus 3D · Art: Quaternius, Poly Haven, Kenney (CC0) ·{' '}
        <a href="#/about" className="underline underline-offset-2">About us</a>
      </footer>
    </div>
  )
}

function Header({ route }: { route: Route }) {
  const user = useGameStore((s) => s.user)
  const webgl = useModeStore((s) => s.webgl)
  const setMode = useModeStore((s) => s.setMode)

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <a href="#/" className="text-lg font-black tracking-tight">
          Campus<span className="text-sky-600">3D</span>
        </a>
        <nav aria-label="Main" className="order-last -mx-1 flex w-full gap-1 overflow-x-auto text-sm sm:order-none sm:w-auto sm:flex-1">
          {NAV.map((n) => (
            <a
              key={n.route}
              href={`#/${n.route}`}
              aria-current={route === n.route ? 'page' : undefined}
              className={`rounded-lg px-3 py-1.5 whitespace-nowrap ${route === n.route ? 'bg-sky-50 font-semibold text-sky-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 text-sm sm:ml-0">
          <a href={user ? '#/profile' : '#/account'} className="flex items-center gap-2 rounded-lg px-3 py-1.5 whitespace-nowrap text-slate-700 hover:bg-slate-100">
            {user?.profile.photo && <img src={user.profile.photo} alt="" className="size-6 rounded-full object-cover" />}
            {user ? displayName(user) : 'Log in'}
          </a>
          {webgl && (
            <button type="button" onClick={() => setMode('3d')} className="rounded-lg bg-sky-600 px-3 py-1.5 font-semibold whitespace-nowrap text-white hover:bg-sky-500">
              Enter 3D campus
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

function Page({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <section>
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
      {intro && <p className="mt-2 max-w-2xl text-slate-600">{intro}</p>}
      <div className="mt-8">{children}</div>
    </section>
  )
}

const AREAS: { title: string; body: string; route: Route | null; color: string }[] = [
  { title: 'Classrooms', body: `${COURSES.length} courses, from web basics to algorithms.`, route: 'learn', color: '#f59e0b' },
  { title: 'Gaming room', body: 'Snake, Sliding Puzzle and Paint-by-Numbers with high scores.', route: 'games', color: '#8b5cf6' },
  { title: 'Conference room', body: 'Live sessions and workshops, plus who we are.', route: 'sessions', color: '#ec4899' },
  { title: 'Office', body: 'Plans and pricing, or request a personal demo.', route: 'pricing', color: '#0ea5e9' },
  { title: 'Sports ground', body: 'Basketball, penalties and cricket — 3D only.', route: null, color: '#16a34a' },
]

function Home() {
  const webgl = useModeStore((s) => s.webgl)
  const setMode = useModeStore((s) => s.setMode)
  return (
    <div>
      <section className="rounded-3xl bg-gradient-to-br from-sky-500 to-indigo-600 px-6 py-12 text-white shadow-lg sm:px-10">
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Learning you can walk into.</h1>
        <p className="mt-4 max-w-xl text-lg text-sky-100">
          A campus with classrooms, a gaming room, an office and a sports ground — explore it in 3D, or browse everything here.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#/learn" className="rounded-xl bg-white px-5 py-2.5 font-semibold text-sky-700 shadow hover:bg-sky-50">Start learning</a>
          {webgl ? (
            <button type="button" onClick={() => setMode('3d')} className="rounded-xl bg-white/15 px-5 py-2.5 font-semibold text-white ring-1 ring-white/40 hover:bg-white/25">
              Enter the 3D campus
            </button>
          ) : (
            <span className="rounded-xl bg-white/10 px-4 py-2.5 text-sm text-sky-100">Your browser doesn&apos;t support 3D (WebGL) — you&apos;re on the 2D version.</span>
          )}
        </div>
      </section>

      <h2 className="mt-12 text-xl font-bold">Around the campus</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AREAS.map((a) => {
          const inner = (
            <>
              <div className="mb-3 h-1.5 w-10 rounded-full" style={{ background: a.color }} />
              <h3 className="font-bold">{a.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{a.body}</p>
            </>
          )
          return a.route ? (
            <a key={a.title} href={`#/${a.route}`} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md">
              {inner}
            </a>
          ) : (
            <div key={a.title} className="rounded-2xl bg-white/60 p-5 ring-1 ring-slate-200">{inner}</div>
          )
        })}
      </div>
    </div>
  )
}

function Games() {
  const [game, setGame] = useState<GameId | null>(null)
  return (
    <Page title={game ? gameMeta(game).title : 'Games'} intro={game ? undefined : `${GAMES.length} quick games from the gaming room. High scores are saved per account.`}>
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <ArcadeContent game={game} onGameChange={setGame} />
      </div>
    </Page>
  )
}

function About() {
  return (
    <Page title="About us" intro="The same deck that plays on the conference-room screen in 3D.">
      <div className="aspect-[920/500] w-full min-h-[420px] overflow-hidden rounded-2xl shadow-lg">
        <SlideDeck keyboard className="!p-6 sm:!p-10" />
      </div>
    </Page>
  )
}

function Account() {
  const user = useGameStore((s) => s.user)
  return (
    <Page title={user ? 'Your account' : 'Log in or sign up'}>
      <div className="max-w-lg rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <AuthContent onDone={() => navigate('home')} profileLink={{ label: 'Set up your profile', onClick: () => navigate('profile') }} />
      </div>
    </Page>
  )
}

function ProfilePage() {
  return (
    <Page title="Your profile" intro="How you appear on campus. Your email comes from signup; your password is never shown.">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <ProfileContent avatarPreview={false} needAccount={{ label: 'Sign up or log in', onClick: () => navigate('account') }} />
      </div>
    </Page>
  )
}
