'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { useSession } from '@/components/providers/session-provider'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { commentSchema } from '@/lib/validators'

const MAX = 1000

export function CommentForm({ gameId }: { gameId: number }) {
  const router = useRouter()
  const { userId, requireAuth } = useSession()
  const [body, setBody] = useState('')
  const [isSpoiler, setIsSpoiler] = useState(false)
  const [sending, setSending] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!requireAuth() || !userId) return
    const parsed = commentSchema.safeParse({ body, isSpoiler })
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? 'Revisa el comentario')

    setSending(true)
    const { error } = await createClient()
      .from('comments')
      .insert({ user_id: userId, game_id: gameId, body: parsed.data.body, is_spoiler: parsed.data.isSpoiler })
    setSending(false)
    // Los mensajes de límite, enlaces y palabras no permitidas vienen de la base, ya en español.
    if (error) return toast.error(error.message)

    setBody('')
    setIsSpoiler(false)
    toast.success('Comentario publicado')
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-lg border p-3">
      <Label htmlFor="comment" className="sr-only">
        Tu comentario
      </Label>
      <Textarea
        id="comment"
        value={body}
        maxLength={MAX}
        rows={3}
        placeholder={userId ? '¿Qué opinas de este juego?' : 'Ingresa para comentar'}
        onFocus={() => !userId && requireAuth()}
        onChange={(e) => setBody(e.target.value)}
        className="resize-none border-0 bg-transparent p-1 focus-visible:ring-0"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Checkbox id="spoiler" checked={isSpoiler} onCheckedChange={(v) => setIsSpoiler(v === true)} />
          <Label htmlFor="spoiler" className="text-sm font-normal text-muted-foreground">
            Contiene spoilers
          </Label>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground tabular-nums">
            {body.length}/{MAX.toLocaleString('es')}
          </span>
          <Button type="submit" size="sm" disabled={sending || (Boolean(userId) && body.trim().length === 0)}>
            Publicar
          </Button>
        </div>
      </div>
    </form>
  )
}
