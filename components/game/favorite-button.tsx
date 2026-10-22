'use client'

import { Heart } from 'lucide-react'
import { useState } from 'react'

import { useSession } from '@/components/providers/session-provider'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function countLabel(count: number) {
  if (count === 0) return 'Sé el primero en agregarlo a favoritos'
  return count === 1
    ? '1 persona lo tiene en favoritos'
    : `${count.toLocaleString('es')} personas lo tienen en favoritos`
}

// Un clic desde la ficha o desde las tarjetas (J2). Cambia al instante y se
// revierte si la base rechaza la operación.
export function FavoriteButton({
  gameId,
  title,
  variant = 'icon',
  initialCount,
  className,
}: {
  gameId: number
  title: string
  variant?: 'icon' | 'full'
  initialCount?: number
  className?: string
}) {
  const { favoriteIds, toggleFavorite } = useSession()
  const active = favoriteIds.has(gameId)
  const [count, setCount] = useState(initialCount)

  async function onClick(event: React.MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    const delta = active ? -1 : 1
    setCount((c) => (c == null ? c : c + delta))
    const result = await toggleFavorite(gameId)
    if (result === null) setCount((c) => (c == null ? c : c - delta))
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        aria-label={active ? `Quitar ${title} de favoritos` : `Agregar ${title} a favoritos`}
        className={cn(
          'flex size-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:scale-110',
          className,
        )}
      >
        <Heart className={cn('size-4', active && 'fill-red-500 text-red-500')} />
      </button>
    )
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <Button size="lg" variant={active ? 'secondary' : 'default'} onClick={onClick} aria-pressed={active}>
        <Heart className={cn('size-4', active && 'fill-red-500 text-red-500')} />
        {active ? 'En tus favoritos' : 'Agregar a favoritos'}
      </Button>
      {count != null && <p className="text-xs text-muted-foreground">{countLabel(count)}</p>}
    </div>
  )
}
