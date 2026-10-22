'use client'

import { EyeOff, Heart, MoreVertical, Pencil, Trash2, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { FollowButton } from '@/components/profile/follow-button'
import { UserAvatar } from '@/components/profile/user-avatar'
import { useSession } from '@/components/providers/session-provider'
import { RelativeTime } from '@/components/relative-time'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import type { CommentView } from '@/lib/data/comments'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { commentSchema } from '@/lib/validators'

import { ReportDialog } from './report-dialog'

// Tarjeta de comentario: avatar, usuario, tiempo relativo, texto, like con contador
// y menú ⋮ (editar, borrar, reportar).
export function CommentCard({ comment, isOwn }: { comment: CommentView; isOwn: boolean }) {
  const router = useRouter()
  const { userId, requireAuth } = useSession()
  const [liked, setLiked] = useState(comment.likedByMe)
  const [likes, setLikes] = useState(comment.likesCount)
  const [revealed, setRevealed] = useState(!comment.isSpoiler)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(comment.body)
  const [reporting, setReporting] = useState(false)

  const { author } = comment
  const hidden = comment.status === 'hidden'

  async function toggleLike() {
    if (!requireAuth({ type: 'like', commentId: comment.id }) || !userId) return
    const next = !liked
    setLiked(next)
    setLikes((n) => n + (next ? 1 : -1))
    const supabase = createClient()
    const { error } = next
      ? await supabase.from('comment_likes').insert({ user_id: userId, comment_id: comment.id })
      : await supabase.from('comment_likes').delete().eq('user_id', userId).eq('comment_id', comment.id)
    if (error) {
      setLiked(!next)
      setLikes((n) => n + (next ? -1 : 1))
      toast.error(error.message)
    }
  }

  async function saveEdit() {
    const parsed = commentSchema.safeParse({ body: draft, isSpoiler: comment.isSpoiler })
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? 'Revisa el comentario')
    const { error } = await createClient().from('comments').update({ body: parsed.data.body }).eq('id', comment.id)
    if (error) return toast.error(error.message)
    setEditing(false)
    toast.success('Comentario editado')
    router.refresh()
  }

  async function remove() {
    if (!window.confirm('¿Borrar este comentario?')) return
    const { error } = await createClient().from('comments').update({ status: 'deleted' }).eq('id', comment.id)
    if (error) return toast.error(error.message)
    toast.success('Comentario borrado')
    router.refresh()
  }

  return (
    <article className={cn('rounded-lg border p-4', hidden && 'border-dashed opacity-70')}>
      <header className="flex items-start gap-3">
        <Link href={`/u/${author.username}`} aria-label={`Perfil de @${author.username}`}>
          <UserAvatar username={author.username} avatarUrl={author.avatarUrl} className="size-9" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 text-sm">
            <Link href={`/u/${author.username}`} className="font-medium hover:underline">
              {author.displayName ?? author.username}
            </Link>
            <span className="text-muted-foreground">@{author.username}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              <RelativeTime date={comment.createdAt} />
            </span>
            {comment.editedAt && <span className="text-xs text-muted-foreground">(editado)</span>}
          </div>
          {comment.game && (
            <Link href={`/juego/${comment.game.slug}`} className="text-xs text-primary hover:underline">
              en {comment.game.title}
            </Link>
          )}
        </div>
        {!isOwn && (
          <FollowButton
            userId={author.id}
            username={author.username}
            initialStatus={comment.followStatus}
            className="hidden h-7 min-w-0 px-2 text-xs sm:inline-flex"
          />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" aria-label="Opciones del comentario">
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isOwn ? (
              <>
                {!hidden && (
                  <DropdownMenuItem onSelect={() => setEditing(true)}>
                    <Pencil /> Editar
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={remove} className="text-destructive">
                  <Trash2 /> Borrar
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onSelect={() => requireAuth() && setReporting(true)}>
                <TriangleAlert /> Reportar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {hidden && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <EyeOff className="size-3.5" /> Oculto por reportes de la comunidad: está en revisión.
        </p>
      )}

      <div className="mt-3 pl-12">
        {editing ? (
          <div className="space-y-2">
            <Textarea value={draft} maxLength={1000} rows={3} onChange={(e) => setDraft(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveEdit}>
                Guardar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative">
            <p
              className={cn('text-sm leading-relaxed whitespace-pre-line', !revealed && 'blur-sm select-none')}
              aria-hidden={!revealed}
            >
              {comment.body}
            </p>
            {!revealed && (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="absolute inset-0 m-auto h-fit w-fit rounded-md bg-background/90 px-3 py-1.5 text-xs font-medium"
              >
                ⚠️ Spoiler · Toca para ver
              </button>
            )}
          </div>
        )}

        <div className="mt-3">
          <button
            type="button"
            onClick={toggleLike}
            disabled={isOwn}
            aria-pressed={liked}
            aria-label={isOwn ? `${likes} me gusta` : liked ? 'Quitar me gusta' : 'Me gusta'}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm text-muted-foreground transition hover:text-foreground disabled:cursor-default disabled:hover:text-muted-foreground',
              liked && 'text-red-400 hover:text-red-400',
            )}
          >
            <Heart className={cn('size-4', liked && 'fill-current')} />
            <span className="tabular-nums">{likes}</span>
          </button>
        </div>
      </div>

      {reporting && <ReportDialog commentId={comment.id} onClose={() => setReporting(false)} />}
    </article>
  )
}
