import { describe, expect, it } from 'vitest'

import { formatCountdown, formatDate, formatRelative, scoreTier } from './format'

describe('formatDate', () => {
  it('usa dd/mm/aaaa', () => {
    expect(formatDate('2026-03-05T15:00:00Z', 'UTC')).toBe('05/03/2026')
  })

  it('respeta la zona horaria del usuario', () => {
    const midnightUtc = '2026-11-20T00:00:00Z'
    expect(formatDate(midnightUtc, 'America/Mexico_City')).toBe('19/11/2026')
    expect(formatDate(midnightUtc, 'America/Argentina/Buenos_Aires')).toBe('19/11/2026')
    expect(formatDate(midnightUtc, 'Europe/Madrid')).toBe('20/11/2026')
  })
})

describe('formatRelative', () => {
  const now = new Date('2026-10-22T12:00:00Z')

  it.each([
    ['2026-10-22T11:59:30Z', 'ahora'],
    ['2026-10-22T11:55:00Z', 'hace 5 min'],
    ['2026-10-22T10:00:00Z', 'hace 2 h'],
    ['2026-10-19T12:00:00Z', 'hace 3 d'],
  ])('%s → %s', (date, expected) => {
    expect(formatRelative(date, now)).toBe(expected)
  })

  it('pasada una semana muestra la fecha', () => {
    expect(formatRelative('2026-10-01T12:00:00Z', now, 'UTC')).toBe('01/10/2026')
  })
})

describe('formatCountdown', () => {
  const now = new Date(2026, 9, 22, 18, 0)

  it.each([
    [new Date(2026, 9, 22, 23, 0), 'hoy'],
    [new Date(2026, 9, 23, 1, 0), 'mañana'],
    [new Date(2026, 10, 3), 'en 12 días'],
  ])('%s → %s', (date, expected) => {
    expect(formatCountdown(date, now)).toBe(expected)
  })
})

describe('scoreTier', () => {
  it.each([
    [92, 'high'],
    [75, 'high'],
    [74.9, 'mid'],
    [50, 'mid'],
    [49, 'low'],
    [null, null],
  ])('%s → %s', (score, tier) => {
    expect(scoreTier(score)).toBe(tier)
  })
})
