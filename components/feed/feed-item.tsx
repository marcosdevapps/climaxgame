import { Heart, MessageSquare } from 'lucide-react'
import Link from 'next/link'

import { IgdbImage } from '@/components/game/igdb-image'
import { UserAvatar } from '@/components/profile/user-avatar'
import { RelativeTime } from '@/components/relative-time'
import type { FeedItem } from '@/lib/data/feed'

// "Fulano agregó X a favoritos" / "Fulano comentó en X".
export function FeedItemCard({ item, compact = false }: { item: FeedItem; compact?: boolean }) {
  const { actor, game } = item
  const Icon = item.kind === 'favorite' ? Heart : MessageSquare

  return (
    <article className="flex gap-3 rounded-lg border p-3">
      <Link href={`/u/${actor.username}`} className="shrink-0" aria-label={`Perfil de @${actor.username}`}>
        <UserAvatar username={actor.username} avatarUrl={actor.avatarUrl} className="size-9" />
      </Link>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm">
          <Link href={`/u/${actor.username}`} className="font-medium hover:underline">
            {actor.displayName ?? actor.username}
          </Link>{' '}
          <span className="text-muted-foreground">
            <Icon className="mb-0.5 inline size-3.5" aria-hidden />{' '}
            {item.kind === 'favorite' ? 'agregó a favoritos' : 'comentó en'}
          </span>{' '}
          <Link href={`/juego/${game.slug}`} className="font-medium hover:underline">
            {game.title}
          </Link>
        </p>
        {item.kind === 'comment' && !compact && (
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {item.isSpoiler ? <em>Contiene spoilers: ábrelo en la ficha del juego.</em> : item.body}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          <RelativeTime date={item.createdAt} />
        </p>
      </div>
      {game.cover_image_id && (
        <Link
          href={`/juego/${game.slug}`}
          className="relative aspect-[3/4] w-12 shrink-0 overflow-hidden rounded-md bg-muted"
          tabIndex={-1}
        >
          <IgdbImage imageId={game.cover_image_id} size="cover_small" alt="" sizes="48px" />
        </Link>
      )}
    </article>
  )
}
