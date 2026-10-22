// Formatos para LatAm: dd/mm/aaaa en la zona horaria del usuario (un lanzamiento
// a medianoche UTC no cae a la misma hora en Ciudad de México que en Buenos Aires).

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function formatDate(date: Date | string, timeZone?: string) {
  return new Intl.DateTimeFormat('es-419', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone,
  }).format(new Date(date))
}

// "ahora", "hace 5 min", "hace 2 h", "hace 3 d" y, pasada una semana, la fecha.
export function formatRelative(date: Date | string, now: Date = new Date(), timeZone?: string) {
  const elapsed = now.getTime() - new Date(date).getTime()
  if (elapsed < MINUTE) return 'ahora'
  if (elapsed < HOUR) return `hace ${Math.floor(elapsed / MINUTE)} min`
  if (elapsed < DAY) return `hace ${Math.floor(elapsed / HOUR)} h`
  if (elapsed < 7 * DAY) return `hace ${Math.floor(elapsed / DAY)} d`
  return formatDate(date, timeZone)
}

// Cuenta regresiva de "Próximamente": "hoy", "mañana", "en 12 días".
export function formatCountdown(releaseDate: Date | string, now: Date = new Date()) {
  const startOfDay = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  const days = Math.round((startOfDay(new Date(releaseDate)) - startOfDay(now)) / DAY)
  if (days <= 0) return 'hoy'
  if (days === 1) return 'mañana'
  return `en ${days} días`
}

export type ScoreTier = 'high' | 'mid' | 'low'

// Insignia de nota: verde 75+, amarillo 50–74, rojo <50.
export function scoreTier(score: number | null | undefined): ScoreTier | null {
  if (score == null) return null
  if (score >= 75) return 'high'
  if (score >= 50) return 'mid'
  return 'low'
}
