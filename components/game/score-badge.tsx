import { scoreTier } from '@/lib/format'
import { cn } from '@/lib/utils'

const TIER_STYLES = {
  high: 'bg-score-high text-black',
  mid: 'bg-score-mid text-black',
  low: 'bg-score-low text-white',
} as const

// Insignia de nota: verde 75+, amarillo 50–74, rojo <50.
export function ScoreBadge({
  score,
  label = 'Nota',
  size = 'sm',
  className,
}: {
  score: number | null
  label?: string
  size?: 'sm' | 'lg'
  className?: string
}) {
  const tier = scoreTier(score)
  if (score == null || !tier) return null
  const value = Math.round(score)

  return (
    <span
      title={`${label}: ${value}`}
      aria-label={`${label}: ${value} de 100`}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-bold tabular-nums shadow',
        size === 'sm' ? 'min-w-8 px-1.5 py-0.5 text-xs' : 'size-12 text-lg',
        TIER_STYLES[tier],
        className,
      )}
    >
      {value}
    </span>
  )
}
