import { useEffect, useState } from 'react'
import { SLIDES, type Slide } from '../../content/slides'

/**
 * The "About Us / Team" deck: slide + prev / dots / next footer. Designed for a 920×500 box
 * (the conference screen) and also used full-width on the 2D site. No three.js here.
 */
export function SlideDeck({ keyboard = false, className = '' }: { keyboard?: boolean; className?: string }) {
  const [index, setIndex] = useState(0)
  const go = (delta: number) => setIndex((i) => Math.min(SLIDES.length - 1, Math.max(0, i + delta)))

  useEffect(() => {
    if (!keyboard) return
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'Space') go(1)
      else if (e.code === 'ArrowLeft' || e.code === 'KeyA') go(-1)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [keyboard])

  return (
    <div className={`flex h-full w-full flex-col overflow-hidden rounded bg-gradient-to-br from-blue-950 via-indigo-900 to-blue-800 p-10 text-white select-none ${className}`}>
      <div className="flex-1">
        <SlideView slide={SLIDES[index]} />
      </div>
      <footer className="flex items-center justify-between text-sm text-blue-200">
        <button type="button" onClick={() => go(-1)} disabled={index === 0}
          className="rounded-md bg-white/10 px-3 py-1 hover:bg-white/20 disabled:opacity-30" aria-label="Previous slide">
          ← Prev
        </button>
        <div className="flex gap-1.5" aria-label={`Slide ${index + 1} of ${SLIDES.length}`}>
          {SLIDES.map((_, i) => (
            <button key={i} type="button" onClick={() => setIndex(i)} aria-label={`Go to slide ${i + 1}`}
              className={`size-2.5 rounded-full ${i === index ? 'bg-white' : 'bg-white/30'}`} />
          ))}
        </div>
        <button type="button" onClick={() => go(1)} disabled={index === SLIDES.length - 1}
          className="rounded-md bg-white/10 px-3 py-1 hover:bg-white/20 disabled:opacity-30" aria-label="Next slide">
          Next →
        </button>
      </footer>
    </div>
  )
}

export function SlideView({ slide }: { slide: Slide }) {
  switch (slide.kind) {
    case 'title':
      return (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <h2 className="text-6xl font-extrabold tracking-tight">{slide.title}</h2>
          <p className="mt-4 text-2xl text-blue-200">{slide.subtitle}</p>
        </div>
      )
    case 'points':
      return (
        <div>
          <h2 className="mb-8 text-4xl font-bold">{slide.title}</h2>
          <ul className="space-y-4 text-2xl">
            {slide.points.map((p) => (
              <li key={p} className="flex gap-3">
                <span className="text-sky-300">▸</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      )
    case 'stats':
      return (
        <div>
          <h2 className="mb-10 text-4xl font-bold">{slide.title}</h2>
          <div className="grid grid-cols-3 gap-6 text-center">
            {slide.stats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/10 py-8">
                <div className="text-6xl font-extrabold">{s.value}</div>
                <div className="mt-2 text-xl text-blue-200">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )
    case 'team':
      return (
        <div>
          <h2 className="mb-8 text-4xl font-bold">{slide.title}</h2>
          <div className="grid grid-cols-4 gap-5 text-center">
            {slide.members.map((m) => (
              <div key={m.name}>
                <div className="mx-auto flex size-24 items-center justify-center rounded-full text-3xl font-bold" style={{ background: m.color }}>
                  {m.name.split(' ').map((w) => w[0]).join('')}
                </div>
                <div className="mt-3 text-xl font-semibold">{m.name}</div>
                <div className="text-base text-blue-200">{m.role}</div>
              </div>
            ))}
          </div>
        </div>
      )
  }
}
