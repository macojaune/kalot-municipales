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
  isAiGenerated: boolean
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

export type BlindtestTrack = DuelTrack

export type BlindtestTrackStats = {
  trackId: number
  actualLabel: 'ai' | 'human'
  totalAnswers: number
  guessedAiCount: number
  guessedHumanCount: number
  guessedAiPercentage: number
  guessedHumanPercentage: number
  accuracyPercentage: number
  ambiguityScore: number
}

export type BlindtestRoundSummary = {
  trackId: number
  title: string
  userGuess: 'ai' | 'human'
  actualLabel: 'ai' | 'human'
  isCorrect: boolean
}

export type BlindtestSummary = {
  totalRounds: number
  correctAnswers: number
  accuracyPercentage: number
  rounds: BlindtestRoundSummary[]
}

export type StartBlindtestSessionResponse =
  | {
      ok: true
      sessionId: string
      totalRounds: number
      currentRound: number
      track: BlindtestTrack
    }
  | ApiError

export type BlindtestSessionStateResponse =
  | {
      ok: true
      status: 'active'
      sessionId: string
      totalRounds: number
      currentRound: number
      track: BlindtestTrack
    }
  | {
      ok: true
      status: 'completed'
      summary: BlindtestSummary
    }
  | ApiError

export type SubmitBlindtestAnswerResponse =
  | {
      ok: true
      status: 'active'
      result: {
        trackId: number
        userGuess: 'ai' | 'human'
        actualLabel: 'ai' | 'human'
        isCorrect: boolean
      }
      trackStats: BlindtestTrackStats
      totalRounds: number
      currentRound: number
      nextTrack: BlindtestTrack
      summary: BlindtestSummary
    }
  | {
      ok: true
      status: 'completed'
      result: {
        trackId: number
        userGuess: 'ai' | 'human'
        actualLabel: 'ai' | 'human'
        isCorrect: boolean
      }
      trackStats: BlindtestTrackStats
      summary: BlindtestSummary
    }
  | ApiError

const ACTIVE_SESSION_KEY = 'kalot-active-session-id'
const LAST_SUMMARY_KEY = 'kalot-last-summary'
const BLINDTEST_SESSION_KEY = 'kalot-blindtest-session-id'
const BLINDTEST_SUMMARY_KEY = 'kalot-blindtest-summary'
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

function getResponseRequestId(response: Response) {
  return (
    response.headers.get('x-request-id') ||
    response.headers.get('x-nf-request-id') ||
    response.headers.get('cf-ray')
  )
}

async function parseApiResponse<TResponse>(response: Response) {
  const contentType = response.headers.get('content-type') || ''
  const rawText = await response.text()
  const responseRequestId = getResponseRequestId(response)

  if (contentType.includes('application/json')) {
    try {
      const parsed = JSON.parse(rawText) as TResponse & {
        ok?: boolean
        message?: string
        requestId?: string
      }

      if (
        response.ok === false &&
        typeof parsed === 'object' &&
        'ok' in parsed &&
        parsed.ok === false
      ) {
        const baseMessage =
          typeof parsed.message === 'string' && parsed.message.trim()
            ? parsed.message.trim()
            : `Erreur serveur (${response.status}).`

        const requestIdSuffix =
          typeof parsed.requestId === 'string' && parsed.requestId.trim()
            ? ` [requestId: ${parsed.requestId.trim()}]`
            : responseRequestId
              ? ` [requestId: ${responseRequestId}]`
              : ''

        throw new Error(`${baseMessage}${requestIdSuffix}`)
      }

      return parsed as TResponse
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }

      throw new Error('La reponse JSON du serveur est invalide.')
    }
  }

  if (!response.ok) {
    const baseMessage = normalizeHttpErrorMessage(response.status, rawText)
    const requestIdSuffix = responseRequestId
      ? ` [requestId: ${responseRequestId}]`
      : ''

    throw new Error(`${baseMessage}${requestIdSuffix}`)
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

export function setBlindtestSessionId(sessionId: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(BLINDTEST_SESSION_KEY, sessionId)
}

export function getBlindtestSessionId() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(BLINDTEST_SESSION_KEY)
}

export function clearBlindtestSessionId() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(BLINDTEST_SESSION_KEY)
}

export function setBlindtestSummary(summary: BlindtestSummary) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(BLINDTEST_SUMMARY_KEY, JSON.stringify(summary))
}

export function getBlindtestSummary() {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(BLINDTEST_SUMMARY_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as BlindtestSummary
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
