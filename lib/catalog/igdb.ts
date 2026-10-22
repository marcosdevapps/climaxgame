// Cliente de IGDB (API v4). Solo se usa en el servidor: IGDB no acepta llamadas
// desde el navegador y las credenciales de Twitch no deben llegar al cliente.

const TOKEN_URL = 'https://id.twitch.tv/oauth2/token'
const API_URL = 'https://api.igdb.com/v4'

// IGDB permite 4 peticiones por segundo.
const MIN_INTERVAL_MS = 260
const MAX_RETRIES = 3

let cachedToken: { value: string; expiresAt: number } | null = null
let lastRequestAt = 0
let queue: Promise<unknown> = Promise.resolve()

function credentials() {
  const clientId = process.env.TWITCH_CLIENT_ID
  const clientSecret = process.env.TWITCH_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Faltan TWITCH_CLIENT_ID y TWITCH_CLIENT_SECRET (ver .env.example)')
  }
  return { clientId, clientSecret }
}

export function hasIgdbCredentials() {
  return Boolean(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET)
}

async function getToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value

  const { clientId, clientSecret } = credentials()
  const response = await fetch(
    `${TOKEN_URL}?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
    { method: 'POST' },
  )
  if (!response.ok) throw new Error(`Twitch OAuth respondió ${response.status}`)

  const data = (await response.json()) as { access_token: string; expires_in: number }
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
  return cachedToken.value
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Serializa las peticiones para respetar el límite de IGDB aunque se llame en paralelo.
function throttled<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now()
    if (wait > 0) await sleep(wait)
    lastRequestAt = Date.now()
    return task()
  })
  queue = run.catch(() => undefined)
  return run
}

// Consulta Apicalypse, p. ej. igdbQuery('games', 'fields name; where id = 1942;')
export async function igdbQuery<T>(endpoint: string, body: string): Promise<T[]> {
  const { clientId } = credentials()

  for (let attempt = 0; ; attempt++) {
    const token = await getToken()
    const response = await throttled(() =>
      fetch(`${API_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Client-ID': clientId, Authorization: `Bearer ${token}` },
        body,
        cache: 'no-store',
      }),
    )

    if (response.ok) return (await response.json()) as T[]

    if (response.status === 401) cachedToken = null
    const retriable = response.status === 401 || response.status === 429 || response.status >= 500
    if (!retriable || attempt >= MAX_RETRIES) {
      throw new Error(`IGDB ${endpoint} respondió ${response.status}: ${await response.text()}`)
    }
    await sleep(500 * 2 ** attempt)
  }
}
