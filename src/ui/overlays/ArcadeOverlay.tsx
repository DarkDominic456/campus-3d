import { Suspense, useCallback, useEffect, useState } from 'react'
import { OverlayShell } from './OverlayShell'
import { GAMES, gameMeta, type GameId } from '../../minigames/registry'
import { scores, type ScoreEntry, type SubmitScoreResult } from '../../services/scores'
import { useGameStore, type OverlayPropsMap } from '../../store/useGameStore'
import { displayName } from '../../services/auth'
import { playSound } from '../../audio/audio'
import { useTourStore } from '../../tour/tour'

/** Current player's identity for scores: their account, or the shared 'guest' slot. */
function usePlayerId() {
  const user = useGameStore((s) => s.user)
  return { userId: user?.id ?? 'guest', name: displayName(user), isGuest: !user }
}

/** Gaming room: mini-game launcher, game host and per-user high scores. */
export function ArcadeOverlay({ game: initialGame }: OverlayPropsMap['arcade']) {
  const [game, setGame] = useState<GameId | null>(initialGame ?? null)
  return (
    <OverlayShell title={game ? gameMeta(game).title : 'Arcade'} size="lg">
      <ArcadeContent game={game} onGameChange={setGame} />
    </OverlayShell>
  )
}

/** Launcher or a running game (controlled, so the host can title itself). */
export function ArcadeContent({ game, onGameChange }: { game: GameId | null; onGameChange: (g: GameId | null) => void }) {
  return game ? <GameHost key={game} id={game} onBack={() => onGameChange(null)} /> : <Launcher onPlay={onGameChange} />
}

function Launcher({ onPlay }: { onPlay: (id: GameId) => void }) {
  const { userId, isGuest } = usePlayerId()
  const [bests, setBests] = useState<Record<string, number | null>>({})
  const [boards, setBoards] = useState<Record<string, ScoreEntry[]>>({})

  useEffect(() => {
    let cancelled = false
    Promise.all(GAMES.map(async (g) => [g.id, await scores.getBest(g.id, userId), await scores.leaderboard(g.id, 3)] as const)).then(
      (rows) => {
        if (cancelled) return
        setBests(Object.fromEntries(rows.map(([id, best]) => [id, best])))
        setBoards(Object.fromEntries(rows.map(([id, , board]) => [id, board])))
      },
    )
    return () => {
      cancelled = true
    }
  }, [userId])

  return (
    <div>
      {isGuest && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Playing as a guest — log in at the gate to keep high scores on your account.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {GAMES.map((g) => (
          <article key={g.id} className="flex flex-col rounded-2xl border border-slate-200 p-4">
            <div className="mb-3 h-2 rounded-full" style={{ background: g.color }} />
            <h3 className="text-lg font-bold">{g.title}</h3>
            <p className="mt-1 flex-1 text-sm text-slate-600">{g.description}</p>
            <p className="mt-2 text-xs text-slate-500">{g.controls}</p>
            <p className="mt-3 text-sm">
              Your best: <strong>{bests[g.id] ?? '—'}</strong>
            </p>
            {boards[g.id]?.length ? (
              <ol className="mt-2 space-y-0.5 text-xs text-slate-600">
                {boards[g.id].map((e, i) => (
                  <li key={e.userId} className="flex justify-between">
                    <span>
                      {i + 1}. {e.name}
                    </span>
                    <span className="font-semibold">{e.score}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-xs text-slate-400">No scores yet — be the first!</p>
            )}
            <button
              type="button"
              onClick={() => onPlay(g.id)}
              className="mt-4 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
              style={{ background: g.color }}
            >
              Play
            </button>
          </article>
        ))}
      </div>
    </div>
  )
}

function GameHost({ id, onBack }: { id: GameId; onBack: () => void }) {
  const meta = gameMeta(id)
  const { userId, name, isGuest } = usePlayerId()
  const [run, setRun] = useState(0)
  const [best, setBest] = useState<number | null>(null)
  const [result, setResult] = useState<(SubmitScoreResult & { score: number }) | null>(null)
  const Game = meta.component

  useEffect(() => {
    scores.getBest(id, userId).then(setBest)
  }, [id, userId, run])

  const onGameOver = useCallback(
    (score: number) => {
      useTourStore.getState().complete('arcade')
      scores.submit({ gameId: id, userId, name, score }).then((r) => {
        playSound(r.isNewBest ? 'achievement' : 'good', { volume: 0.6 })
        setResult({ ...r, score })
        setBest(r.best)
      })
    },
    [id, userId, name],
  )

  const playAgain = () => {
    setResult(null)
    setRun((r) => r + 1)
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-sm">
        <button type="button" onClick={onBack} className="rounded-md px-2 py-1 font-medium text-slate-600 hover:bg-slate-100">
          ← All games
        </button>
        <span className="text-slate-600">
          Best: <strong>{best ?? '—'}</strong>
        </span>
      </div>
      <div className="relative">
        <Suspense fallback={<p className="py-20 text-center text-slate-500">Loading {meta.title}…</p>}>
          <Game key={run} onGameOver={onGameOver} />
        </Suspense>
        {result && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/85 backdrop-blur-sm" role="status">
            <div className="text-center">
              {result.isNewBest && <p className="mb-1 text-sm font-bold tracking-wide text-amber-600 uppercase">New high score!</p>}
              <p className="text-5xl font-extrabold">{result.score}</p>
              <p className="mt-1 text-sm text-slate-600">Your best: {result.best}</p>
              {isGuest && <p className="mt-1 text-xs text-slate-500">Log in at the gate to save scores to your account.</p>}
              <div className="mt-5 flex justify-center gap-2">
                <button type="button" onClick={playAgain} autoFocus
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: meta.color }}>
                  Play again
                </button>
                <button type="button" onClick={onBack} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">
                  All games
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
