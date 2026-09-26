import type { CharacterVariant } from '../assets/models'

/** Public profile fields, edited at the office profile desk (or `#/profile` in 2D). */
export interface Profile {
  displayName: string
  /** Square JPEG data URL (256×256), or '' for none. */
  photo: string
  phone: string
  tagline: string
  location: string
  about: string
  careerSummary: string
}

export interface User {
  id: string
  email: string
  /** 3D character used for the player. */
  avatar: CharacterVariant
  profile: Profile
  createdAt: string
  updatedAt: string
}

export interface SignUpInput {
  email: string
  password: string
}

export interface LogInInput {
  email: string
  password: string
}

export class AuthError extends Error {}

/**
 * Auth + profile API used by the UI. The app only talks to this interface, so swapping the
 * mock for Supabase means replacing `auth` below — nothing else changes.
 */
export interface AuthService {
  getSession(): Promise<User | null>
  signUp(input: SignUpInput): Promise<User>
  logIn(input: LogInInput): Promise<User>
  logOut(): Promise<void>
  updateProfile(user: User, patch: Partial<Profile>): Promise<User>
  updateAvatar(user: User, avatar: CharacterVariant): Promise<User>
  /** Throws AuthError if `current` is wrong. */
  changePassword(user: User, current: string, next: string): Promise<void>
  /** Re-checks the password; throws AuthError if it's wrong or the email is taken. */
  changeEmail(user: User, newEmail: string, password: string): Promise<User>
}

export const EMPTY_PROFILE: Profile = {
  displayName: '',
  photo: '',
  phone: '',
  tagline: '',
  location: '',
  about: '',
  careerSummary: '',
}

/** Name to show in the UI: the profile name, or the part of the email before "@". */
export const displayName = (user: User | null | undefined, fallback = 'Guest') =>
  user ? user.profile.displayName.trim() || user.email.split('@')[0] : fallback

// ---------------------------------------------------------------------------
// Mock implementation. Accounts live in this browser's localStorage.
// Passwords are never stored: only a PBKDF2-SHA256 hash with a random per-user salt.
// This is still a demo — anyone with access to the browser can edit localStorage.
//
// TODO(Supabase): implement AuthService with @supabase/supabase-js:
//   signUp         → supabase.auth.signUp({ email, password })
//   logIn          → supabase.auth.signInWithPassword({ email, password })
//   logOut         → supabase.auth.signOut()
//   session        → supabase.auth.getSession() (+ onAuthStateChange to keep the store in sync)
//   changePassword → re-authenticate, then supabase.auth.updateUser({ password })
//   changeEmail    → supabase.auth.updateUser({ email }) (sends a confirmation mail)
//   profile        → `profiles` table (id = auth.users.id, display_name, phone, tagline,
//                    location, about, career_summary, avatar, photo_url) with RLS
//                    "users can read all / update own row"; photos in a public `avatars`
//                    storage bucket (upload the 256×256 JPEG, store its URL).
// ---------------------------------------------------------------------------

const USERS_KEY = 'campus3d.mockUsers'
const SESSION_KEY = 'campus3d.mockSession'
const LATENCY_MS = 300
const PBKDF2_ITERATIONS = 150_000

interface StoredUser extends User {
  /** Hex-encoded salt and PBKDF2 hash. Missing on accounts created before hashing existed. */
  salt?: string
  hash?: string
}

const wait = () => new Promise((r) => setTimeout(r, LATENCY_MS))
const toHex = (bytes: ArrayBuffer | Uint8Array) =>
  [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
const fromHex = (hex: string) => new Uint8Array(hex.match(/.{2}/g)!.map((h) => parseInt(h, 16)))

async function hashPassword(password: string, saltHex?: string) {
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS }, key, 256)
  return { salt: toHex(salt), hash: toHex(bits) }
}

/** Constant-time-ish comparison (length is fixed for our hashes). */
const sameHash = (a: string, b: string) => a.length === b.length && [...a].reduce((d, c, i) => d | (c.charCodeAt(0) ^ b.charCodeAt(i)), 0) === 0

function readUsers(): Record<string, StoredUser> {
  try {
    const raw = JSON.parse(localStorage.getItem(USERS_KEY) ?? '{}') as Record<string, Partial<StoredUser> & { name?: string }>
    // Migrate accounts from the first mock (flat `name`, no profile / timestamps).
    return Object.fromEntries(
      Object.entries(raw).map(([key, u]) => [
        key,
        {
          ...u,
          profile: { ...EMPTY_PROFILE, displayName: u.name ?? '', ...u.profile },
          createdAt: u.createdAt ?? new Date().toISOString(),
          updatedAt: u.updatedAt ?? new Date().toISOString(),
        } as StoredUser,
      ]),
    )
  } catch {
    return {}
  }
}

function writeUsers(users: Record<string, StoredUser>) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
  } catch {
    throw new AuthError('Could not save — your browser storage may be full or disabled.')
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

/** The public part of a stored account (never hand the hash to the UI). */
const toUser = ({ salt: _salt, hash: _hash, ...user }: StoredUser): User => user

async function checkPassword(stored: StoredUser, password: string) {
  if (!stored.salt || !stored.hash) return true // legacy account: first login sets the hash
  const { hash } = await hashPassword(password, stored.salt)
  return sameHash(hash, stored.hash)
}

function save(user: StoredUser) {
  writeUsers({ ...readUsers(), [user.email]: user })
}

function stored(user: User): StoredUser {
  const found = readUsers()[user.email]
  if (!found) throw new AuthError('Your session has expired. Please log in again.')
  return found
}

const mockAuth: AuthService = {
  async getSession() {
    try {
      const email = localStorage.getItem(SESSION_KEY)
      const found = email ? readUsers()[email] : undefined
      return found ? toUser(found) : null
    } catch {
      return null
    }
  },

  async signUp({ email, password }) {
    await wait()
    const key = normalizeEmail(email)
    if (readUsers()[key]) throw new AuthError('An account with this email already exists. Try logging in.')
    const now = new Date().toISOString()
    const user: StoredUser = {
      id: crypto.randomUUID(),
      email: key,
      avatar: 'male-a',
      profile: { ...EMPTY_PROFILE },
      createdAt: now,
      updatedAt: now,
      ...(await hashPassword(password)),
    }
    save(user)
    setSession(key)
    return toUser(user)
  },

  async logIn({ email, password }) {
    await wait()
    const found = readUsers()[normalizeEmail(email)]
    if (!found || !(await checkPassword(found, password))) throw new AuthError('Email or password is incorrect.')
    if (!found.hash) save({ ...found, ...(await hashPassword(password)) })
    setSession(found.email)
    return toUser(found)
  },

  async logOut() {
    setSession(null)
  },

  async updateProfile(user, patch) {
    await wait()
    const current = stored(user)
    const next: StoredUser = { ...current, profile: { ...current.profile, ...patch }, updatedAt: new Date().toISOString() }
    save(next)
    return toUser(next)
  },

  async updateAvatar(user, avatar) {
    const next: StoredUser = { ...stored(user), avatar, updatedAt: new Date().toISOString() }
    save(next)
    return toUser(next)
  },

  async changePassword(user, current, nextPassword) {
    await wait()
    const found = stored(user)
    if (!(await checkPassword(found, current))) throw new AuthError('Current password is incorrect.')
    save({ ...found, ...(await hashPassword(nextPassword)), updatedAt: new Date().toISOString() })
  },

  async changeEmail(user, newEmail, password) {
    await wait()
    const found = stored(user)
    if (!(await checkPassword(found, password))) throw new AuthError('Password is incorrect.')
    const key = normalizeEmail(newEmail)
    if (key === found.email) return toUser(found)
    const users = readUsers()
    if (users[key]) throw new AuthError('Another account already uses this email.')
    delete users[found.email]
    const next: StoredUser = { ...found, email: key, updatedAt: new Date().toISOString() }
    writeUsers({ ...users, [key]: next })
    setSession(key)
    return toUser(next)
  },
}

export const auth: AuthService = mockAuth
