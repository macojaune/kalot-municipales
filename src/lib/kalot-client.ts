type AuthUser = {
  id: string
  username: string | null
  fullName: string | null
  primaryEmailAddress?: {
    emailAddress?: string | null
  } | null
}

export type DuelTrack = {
  id: number
  title: string
  slug: string
  streamUrl: string | null
  r2Key: string
  rating: number
  wins: number
  losses: number
  appearances: number
  artistName: string
  communeName: string
  listName: string | null
  candidateName: string | null
}

export type ElectionRound = 'round1' | 'round2'

export type SessionDuel = {
  leftTrack: DuelTrack
  rightTrack: DuelTrack
  roundsPlayed: number
  progress?: {
    seen: number
    total: number
  }
}

export type SessionSummary = {
  electionRound: ElectionRound
  communeName: string | null
  roundsPlayed: number
  winnerTrackId: number
  scoreboard: Array<{
    trackId: number
    title: string
    points: number
  }>
}

export type ApiError = {
  ok: false
  code: string
  message: string
}

export type StartSessionResponse =
  | {
      ok: true
      resumed: boolean
      electionRound: ElectionRound
      commune: {
        id: number
        name: string
        slug: string
      } | null
      sessionId: string
      userId: number
      duel: SessionDuel
    }
  | ApiError

export type PickVoteResponse =
  | {
      ok: true
      status: 'active'
      nextChallenger: DuelTrack | null
      roundsPlayed: number
      progress?: {
        seen: number
        total: number
      }
    }
  | {
      ok: true
      status: 'completed'
      summary: SessionSummary
    }
  | {
      ok: true
      status: 'waiting'
      waiting: {
        message: string
      }
      roundsPlayed?: number
      progress?: {
        seen: number
        total: number
      }
    }
  | ApiError

export type SessionStateResponse =
  | {
      ok: true
      status: 'active'
      electionRound: ElectionRound
      communeId: number | null
      duel: SessionDuel
    }
  | {
      ok: true
      status: 'completed'
      summary: SessionSummary
    }
  | {
      ok: true
      status: 'waiting'
      waiting: {
        message: string
      }
    }
  | ApiError

export type LeaderboardResponse = {
  ok: true
  leaderboard: Array<
    DuelTrack & {
      rank: number
      electionRound: ElectionRound
      communeId: number
      communeSlug: string
    }
  >
}

export type VotingStartOptionsResponse = {
  ok: true
  electionRound: ElectionRound | 'closed'
  eligibleCommunes: Array<{
    id: number
    name: string
    slug: string
    trackCount: number
  }>
}

const ACTIVE_SESSION_KEY = 'kalot-active-session-id'
const LAST_SUMMARY_KEY = 'kalot-last-summary'
const LOCAL_USER_KEY = 'kalot-local-user-id'

function normalizeHttpErrorMessage(status: number, bodyText: string) {
  const trimmed = bodyText.trim()

  if (!trimmed) {
    return `Erreur serveur (${status}).`
  }

  const collapsed = trimmed.replace(/\s+/g, ' ')

  if (/^\s*</.test(trimmed)) {
    if (status >= 500) {
      return `Erreur serveur (${status}). Reessaie dans un instant.`
    }

    return `Requete invalide (${status}).`
  }

  if (collapsed.length > 220) {
    return `${collapsed.slice(0, 217)}...`
  }

  return collapsed
}

async function parseApiResponse<TResponse>(response: Response) {
  const contentType = response.headers.get('content-type') || ''
  const rawText = await response.text()

  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(rawText) as TResponse
    } catch {
      throw new Error('La reponse JSON du serveur est invalide.')
    }
  }

  if (!response.ok) {
    throw new Error(normalizeHttpErrorMessage(response.status, rawText))
  }

  throw new Error('Le serveur a renvoye une reponse invalide.')
}

export function getOrCreateLocalUserId() {
  if (typeof window === 'undefined') {
    return null
  }

  const existing = window.localStorage.getItem(LOCAL_USER_KEY)
  if (existing) {
    return existing
  }

  const created = `local-${crypto.randomUUID()}`
  window.localStorage.setItem(LOCAL_USER_KEY, created)
  return created
}

export function getExternalUserId(user: AuthUser | null | undefined) {
  if (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
    return user?.id ?? null
  }

  return getOrCreateLocalUserId()
}

export function getDisplayName(user: AuthUser | null | undefined) {
  if (!user) {
    return 'fan-son'
  }

  if (user.username) {
    return user.username
  }

  if (user.fullName) {
    return user.fullName
  }

  return user.primaryEmailAddress?.emailAddress ?? 'fan-son'
}

export function setActiveSessionId(sessionId: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(ACTIVE_SESSION_KEY, sessionId)
}

export function getActiveSessionId() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(ACTIVE_SESSION_KEY)
}

export function clearActiveSessionId() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(ACTIVE_SESSION_KEY)
}

export function setLastSummary(summary: SessionSummary) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(LAST_SUMMARY_KEY, JSON.stringify(summary))
}

export function getLastSummary() {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(LAST_SUMMARY_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as SessionSummary
  } catch {
    return null
  }
}

export async function postJson<TResponse>(url: string, body: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  return parseApiResponse<TResponse>(response)
}

export async function postFormData<TResponse>(url: string, body: FormData) {
  const response = await fetch(url, {
    method: 'POST',
    body,
  })

  return parseApiResponse<TResponse>(response)
}

export async function deleteJson<TResponse>(url: string, body: unknown) {
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  return parseApiResponse<TResponse>(response)
}

export async function getJson<TResponse>(url: string) {
  const response = await fetch(url)
  return parseApiResponse<TResponse>(response)
}
