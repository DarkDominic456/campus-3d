import type { CharacterVariant } from '../assets/models'

export interface User {
  id: string
  name: string
  email: string
  avatar: CharacterVariant
}

export interface SignUpInput {
  name: string
  email: string
  password: string
  avatar: CharacterVariant
}

export interface LogInInput {
  email: string
  password: string
}

export class AuthError extends Error {}

/**
 * Auth API used by the UI. The app only talks to this interface, so swapping the mock
 * for Supabase means replacing `auth` below — nothing else changes.
 */
export interface AuthService {
  getSession(): Promise<User | null>
  signUp(input: SignUpInput): Promise<User>
  logIn(input: LogInInput): Promise<User>
  logOut(): Promise<void>
  updateAvatar(user: User, avatar: CharacterVariant): Promise<User>
}

// ---------------------------------------------------------------------------
// Mock implementation (Phase 4). Accounts live in this browser's localStorage.
// Passwords are NOT stored or checked beyond length — this is a demo stand-in only.
//
// TODO(Supabase): implement AuthService with @supabase/supabase-js:
//   signUp  → supabase.auth.signUp({ email, password, options: { data: { name, avatar } } })
//   logIn   → supabase.auth.signInWithPassword({ email, password })
//   logOut  → supabase.auth.signOut()
//   session → supabase.auth.getSession() (+ onAuthStateChange to keep the store in sync)
//   avatar  → supabase.auth.updateUser({ data: { avatar } })
// Map user.user_metadata.{name, avatar} onto User.
// ---------------------------------------------------------------------------

const USERS_KEY = 'campus3d.mockUsers'
const SESSION_KEY = 'campus3d.mockSession'
const LATENCY_MS = 400

const wait = () => new Promise((r) => setTimeout(r, LATENCY_MS))

function readUsers(): Record<string, User> {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? '{}') as Record<string, User>
  } catch {
    return {}
  }
}

function writeUsers(users: Record<string, User>) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
  } catch {
    // Storage unavailable: the account still works for this page load.
  }
}

function setSession(email: string | null) {
  try {
    if (email) localStorage.setItem(SESSION_KEY, email)
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore — session just won't survive a reload
  }
}

const normalizeEmail = (email: string) => email.trim().toLowerCase()

const mockAuth: AuthService = {
  async getSession() {
    try {
      const email = localStorage.getItem(SESSION_KEY)
      return email ? (readUsers()[email] ?? null) : null
    } catch {
      return null
    }
  },

  async signUp({ name, email, password, avatar }) {
    await wait()
    const key = normalizeEmail(email)
    const users = readUsers()
    if (users[key]) throw new AuthError('An account with this email already exists. Try logging in.')
    if (password.length < 6) throw new AuthError('Password must be at least 6 characters.')
    const user: User = { id: crypto.randomUUID(), name: name.trim(), email: key, avatar }
    writeUsers({ ...users, [key]: user })
    setSession(key)
    return user
  },

  async logIn({ email, password }) {
    await wait()
    const user = readUsers()[normalizeEmail(email)]
    if (!user || password.length < 6) throw new AuthError('Email or password is incorrect.')
    setSession(user.email)
    return user
  },

  async logOut() {
    setSession(null)
  },

  async updateAvatar(user, avatar) {
    const updated = { ...user, avatar }
    writeUsers({ ...readUsers(), [user.email]: updated })
    return updated
  },
}

export const auth: AuthService = mockAuth
