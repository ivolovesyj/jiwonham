declare global {
  interface Window {
    gtag: (...args: unknown[]) => void
    dataLayer: unknown[]
  }
}

export const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

type UTMFields = {
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
}

type ProductEventPayload = {
  event_name: string
  event_time_utc: string
  anonymous_id: string
  user_id: string | null
  session_id: string
  is_authenticated: boolean
  page_path: string | null
  referrer: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  feature_name: string | null
  action: string | null
  properties: Record<string, unknown>
  app_version: string | null
  env: string
}

const ANALYTICS_API_PATH = '/api/analytics/event'
const ANON_KEY = 'jiwonham_anon_id'
const SESSION_KEY = 'jiwonham_session_id'
const USER_KEY = 'jiwonham_user_id'
const UTM_KEY = 'jiwonham_utm_last'
const SESSION_STARTED_KEY = 'jiwonham_session_started'

const isBrowser = () => typeof window !== 'undefined'

const safeUuid = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const getOrCreateStorageValue = (key: string, storage: Storage): string => {
  const found = storage.getItem(key)
  if (found) return found
  const created = safeUuid()
  storage.setItem(key, created)
  return created
}

const getAnonymousId = (): string | null => {
  if (!isBrowser()) return null
  try {
    return getOrCreateStorageValue(ANON_KEY, window.localStorage)
  } catch {
    return null
  }
}

const getSessionId = (): string | null => {
  if (!isBrowser()) return null
  try {
    return getOrCreateStorageValue(SESSION_KEY, window.sessionStorage)
  } catch {
    return null
  }
}

const getUserId = (): string | null => {
  if (!isBrowser()) return null
  try {
    return window.localStorage.getItem(USER_KEY)
  } catch {
    return null
  }
}

const parseUTMFromUrl = (): UTMFields => {
  if (!isBrowser()) {
    return {
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
      utm_term: null,
    }
  }

  const params = new URLSearchParams(window.location.search)
  return {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_content: params.get('utm_content'),
    utm_term: params.get('utm_term'),
  }
}

const hasAnyUTM = (utm: UTMFields) =>
  Boolean(utm.utm_source || utm.utm_medium || utm.utm_campaign || utm.utm_content || utm.utm_term)

const readStoredUTM = (): UTMFields => {
  if (!isBrowser()) {
    return {
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
      utm_term: null,
    }
  }
  try {
    const raw = window.localStorage.getItem(UTM_KEY)
    if (!raw) {
      return {
        utm_source: null,
        utm_medium: null,
        utm_campaign: null,
        utm_content: null,
        utm_term: null,
      }
    }
    const parsed = JSON.parse(raw) as UTMFields
    return {
      utm_source: parsed.utm_source ?? null,
      utm_medium: parsed.utm_medium ?? null,
      utm_campaign: parsed.utm_campaign ?? null,
      utm_content: parsed.utm_content ?? null,
      utm_term: parsed.utm_term ?? null,
    }
  } catch {
    return {
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
      utm_term: null,
    }
  }
}

const writeStoredUTM = (utm: UTMFields) => {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(UTM_KEY, JSON.stringify(utm))
  } catch {
    // ignore
  }
}

export const captureUTMIfExists = () => {
  if (!isBrowser()) return
  const fromUrl = parseUTMFromUrl()
  if (hasAnyUTM(fromUrl)) {
    writeStoredUTM(fromUrl)
  }
}

const getUTM = (): UTMFields => {
  const fromUrl = parseUTMFromUrl()
  if (hasAnyUTM(fromUrl)) return fromUrl
  return readStoredUTM()
}

const postProductEvent = (payload: ProductEventPayload) => {
  if (!isBrowser()) return
  const body = JSON.stringify(payload)

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon(ANALYTICS_API_PATH, blob)
      return
    } catch {
      // fallback to fetch below
    }
  }

  fetch(ANALYTICS_API_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // swallow analytics failures
  })
}

export const initAnalytics = () => {
  if (!isBrowser()) return
  captureUTMIfExists()
  getAnonymousId()
  getSessionId()

  try {
    if (!window.sessionStorage.getItem(SESSION_STARTED_KEY)) {
      window.sessionStorage.setItem(SESSION_STARTED_KEY, '1')
      trackEvent('session_started')
    }
  } catch {
    // ignore
  }
}

export const identifyUser = (userId: string | null) => {
  if (!isBrowser()) return
  try {
    if (userId) window.localStorage.setItem(USER_KEY, userId)
    else window.localStorage.removeItem(USER_KEY)
  } catch {
    // ignore
  }
}

export function trackPageView(path?: string) {
  if (!isBrowser()) return
  const targetPath = path ?? window.location.pathname
  trackEvent('page_view', { page_path: targetPath })
}

export function trackEvent(eventName: string, params: Record<string, unknown> = {}) {
  if (!isBrowser()) return

  if (window.gtag) {
    window.gtag('event', eventName, params)
  }

  const anonymousId = getAnonymousId()
  const sessionId = getSessionId()
  if (!anonymousId || !sessionId) return

  const userId = getUserId()
  const utm = getUTM()
  const featureName = typeof params.feature_name === 'string' ? params.feature_name : null
  const action = typeof params.action === 'string' ? params.action : null
  const pagePath =
    typeof params.page_path === 'string'
      ? params.page_path
      : (window.location.pathname || null)

  const payload: ProductEventPayload = {
    event_name: eventName,
    event_time_utc: new Date().toISOString(),
    anonymous_id: anonymousId,
    user_id: userId,
    session_id: sessionId,
    is_authenticated: Boolean(userId),
    page_path: pagePath,
    referrer: document.referrer || null,
    utm_source: utm.utm_source,
    utm_medium: utm.utm_medium,
    utm_campaign: utm.utm_campaign,
    utm_content: utm.utm_content,
    utm_term: utm.utm_term,
    feature_name: featureName,
    action,
    properties: params,
    app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? null,
    env: process.env.NODE_ENV ?? 'unknown',
  }

  postProductEvent(payload)
}
