export interface ScoreEntry {
  gameId: string
  userId: string
  name: string
  score: number
  /** ISO date of the run that set this best score. */
  at: string
}

export interface SubmitScoreResult {
  best: number
  isNewBest: boolean
}

/**
 * High-score API used by the arcade. Only the best score per (game, user) is kept.
 * Guests play as userId 'guest'.
 */
export interface ScoreService {
  getBest(gameId: string, userId: string): Promise<number | null>
  submit(entry: Omit<ScoreEntry, 'at'>): Promise<SubmitScoreResult>
  leaderboard(gameId: string, limit?: number): Promise<ScoreEntry[]>
}

// ---------------------------------------------------------------------------
// Mock implementation: scores live in this browser's localStorage.
//
// TODO(Supabase): table `high_scores (game_id text, user_id uuid references auth.users,
// name text, score int, at timestamptz, primary key (game_id, user_id))` with RLS
// "users can upsert their own row", and:
//   getBest     → select score where game_id = $1 and user_id = auth.uid()
//   submit      → upsert only when the new score is higher (or an RPC doing the comparison)
//   leaderboard → select * where game_id = $1 order by score desc limit $2
// Validate scores server-side (e.g. plausibility limits) — the client can send anything.
// ---------------------------------------------------------------------------

const KEY = 'campus3d.highScores'
type Table = Record<string, Record<string, ScoreEntry>> // gameId → userId → best entry

function read(): Table {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Table
  } catch {
    return {}
  }
}

function write(table: Table) {
  try {
    localStorage.setItem(KEY, JSON.stringify(table))
  } catch {
    // storage unavailable — scores last for this page load only
  }
}

let memory: Table | null = null
const load = () => (memory ??= read())

const mockScores: ScoreService = {
  async getBest(gameId, userId) {
    return load()[gameId]?.[userId]?.score ?? null
  },

  async submit({ gameId, userId, name, score }) {
    const table = load()
    const previous = table[gameId]?.[userId]?.score ?? null
    const isNewBest = previous === null || score > previous
    if (isNewBest) {
      table[gameId] = { ...table[gameId], [userId]: { gameId, userId, name, score, at: new Date().toISOString() } }
      write(table)
    }
    return { best: isNewBest ? score : previous!, isNewBest }
  },

  async leaderboard(gameId, limit = 5) {
    return Object.values(load()[gameId] ?? {})
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  },
}

export const scores: ScoreService = mockScores
