import Link from 'next/link'

import { getGameComments } from '@/lib/data/comments'
import { getCurrentUserId } from '@/lib/data/session'
import { cn } from '@/lib/utils'

import { CommentCard } from './comment-card'
import { CommentForm } from './comment-form'

// Comunidad de la ficha (C1–C3): caja para comentar arriba, orden por relevancia o
// fecha, y la lista. Para visitantes, la caja abre el registro.
export async function CommentsSection({
  gameId,
  gameSlug,
  sort,
}: {
  gameId: number
  gameSlug: string
  sort: 'relevant' | 'recent'
}) {
  const [comments, me] = await Promise.all([getGameComments(gameId, sort), getCurrentUserId()])

  return (
    <section aria-labelledby="comunidad" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="comunidad" className="text-lg font-semibold">
          Comentarios <span className="text-muted-foreground">({comments.length})</span>
        </h2>
        <nav className="flex gap-1 text-sm" aria-label="Ordenar comentarios">
          {(
            [
              ['relevant', 'Más relevantes', `/juego/${gameSlug}`],
              ['recent', 'Más recientes', `/juego/${gameSlug}?orden=recientes`],
            ] as const
          ).map(([key, label, href]) => (
            <Link
              key={key}
              href={href}
              scroll={false}
              aria-current={sort === key ? 'true' : undefined}
              className={cn(
                'rounded-md px-2.5 py-1 text-muted-foreground hover:text-foreground',
                sort === key && 'bg-muted text-foreground',
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <CommentForm gameId={gameId} />

      {comments.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Todavía nadie comentó este juego. ¡Abre la conversación!
        </p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id}>
              <CommentCard comment={comment} isOwn={comment.author.id === me} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
