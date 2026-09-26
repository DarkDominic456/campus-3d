import { useState } from 'react'
import { OverlayShell } from './OverlayShell'
import { COURSES, type Course } from '../../content/courses'
import { useGameStore } from '../../store/useGameStore'
import { displayName } from '../../services/auth'

const PROGRESS_KEY = 'campus3d.learningProgress'

type Progress = Record<string, string[]> // `${userId}:${courseId}` → completed lesson titles

function readProgress(): Progress {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '{}') as Progress
  } catch {
    return {}
  }
}

/**
 * The classroom laptop's "Learning" page: course list + lessons.
 * Progress is kept per user (or 'guest') in localStorage — TODO(backend): store it with the account.
 */
export function LearningContent() {
  const user = useGameStore((s) => s.user)
  const [selected, setSelected] = useState<Course>(COURSES[0])
  const [progress, setProgress] = useState<Progress>(readProgress)
  const who = user?.id ?? 'guest'
  const done = (course: Course) => progress[`${who}:${course.id}`] ?? []

  const toggleLesson = (course: Course, lesson: string) => {
    const key = `${who}:${course.id}`
    const current = progress[key] ?? []
    const next = { ...progress, [key]: current.includes(lesson) ? current.filter((l) => l !== lesson) : [...current, lesson] }
    setProgress(next)
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(next))
    } catch {
      // storage unavailable — progress lasts for this session only
    }
  }

  return (
    <>
      <p className="mb-4 text-sm text-slate-600">
        {user ? `Welcome back, ${displayName(user)}.` : 'You are learning as a guest — log in at the gate to keep your progress with your account.'}
      </p>
      <div className="grid gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <ul className="space-y-2" aria-label="Courses">
          {COURSES.map((course) => {
            const pct = Math.round((done(course).length / course.lessons.length) * 100)
            const active = course.id === selected.id
            return (
              <li key={course.id}>
                <button
                  type="button"
                  onClick={() => setSelected(course)}
                  aria-current={active}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    active ? 'border-sky-500 bg-sky-50' : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: course.color }} />
                    <span className="font-semibold">{course.title}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {course.level} · {course.lessons.length} lessons
                    </span>
                    <span>{pct}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: course.color }} />
                  </div>
                </button>
              </li>
            )
          })}
        </ul>

        <section aria-label={selected.title} className="rounded-xl border border-slate-200 p-4">
          <h3 className="text-xl font-bold">{selected.title}</h3>
          <p className="mt-1 text-sm text-slate-600">{selected.summary}</p>
          <ol className="mt-4 space-y-2">
            {selected.lessons.map((lesson, i) => {
              const complete = done(selected).includes(lesson.title)
              return (
                <li key={lesson.title} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
                  <span className="w-5 text-sm font-semibold text-slate-400">{i + 1}</span>
                  <span className={`flex-1 text-sm ${complete ? 'text-slate-400 line-through' : ''}`}>{lesson.title}</span>
                  <span className="text-xs text-slate-500">{lesson.minutes} min</span>
                  <button
                    type="button"
                    onClick={() => toggleLesson(selected, lesson.title)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                      complete ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-600 text-white hover:bg-sky-500'
                    }`}
                  >
                    {complete ? 'Done ✓' : 'Start'}
                  </button>
                </li>
              )
            })}
          </ol>
        </section>
      </div>
    </>
  )
}

export function LearningOverlay() {
  return (
    <OverlayShell title="Learning" size="xl" backdrop="light" escLabel="to stand up">
      <LearningContent />
    </OverlayShell>
  )
}
