'use client'

import { useSyncExternalStore } from 'react'

import { formatCountdown, formatDate } from '@/lib/format'

const subscribe = () => () => {}

// Cuenta regresiva calculada en el navegador (el HTML viene cacheado);
// en el servidor se muestra la fecha.
export function ReleaseCountdown({ date }: { date: string }) {
  const label = useSyncExternalStore(
    subscribe,
    () => formatCountdown(date),
    () => formatDate(date, 'UTC'),
  )
  return <>{label}</>
}
