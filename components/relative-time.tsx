'use client'

import { useSyncExternalStore } from 'react'

import { formatDate, formatRelative } from '@/lib/format'

const subscribe = () => () => {}

// "hace 2 h" se calcula en el navegador (hora y zona del usuario); el servidor
// muestra la fecha para no desajustar la hidratación.
export function RelativeTime({ date }: { date: string }) {
  const label = useSyncExternalStore(
    subscribe,
    () => formatRelative(date),
    () => formatDate(date, 'UTC'),
  )
  return (
    <time dateTime={date} title={new Date(date).toISOString()}>
      {label}
    </time>
  )
}
