'use client'

import { Loader2, Upload } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { deleteAccount } from '@/app/ajustes/actions'
import { UserAvatar } from '@/components/profile/user-avatar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { formatDate } from '@/lib/format'
import { createClient } from '@/lib/supabase/client'
import type { TablesUpdate } from '@/lib/supabase/database.types'
import { AVATAR_MAX_BYTES, AVATAR_TYPES, PLATFORMS, profileSchema, usernameSchema } from '@/lib/validators'

const PLATFORM_LABELS = { pc: 'PC', playstation: 'PlayStation', xbox: 'Xbox', switch: 'Switch', mobile: 'Móvil' }
const USERNAME_COOLDOWN_DAYS = 30

// Sube a avatars/<uid>/, actualiza el perfil y borra los avatares anteriores.
async function storeAvatar(userId: string, file: File): Promise<{ url: string } | { error: string }> {
  const supabase = createClient()
  const path = `${userId}/${Date.now()}.${file.type.split('/')[1]}`
  const { error } = await supabase.storage.from('avatars').upload(path, file, { contentType: file.type })
  if (error) return { error: error.message }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  const { error: updateError } = await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', userId)
  if (updateError) return { error: updateError.message }

  const { data: files } = await supabase.storage.from('avatars').list(userId)
  const stale = (files ?? []).map((f) => `${userId}/${f.name}`).filter((p) => p !== path)
  if (stale.length > 0) await supabase.storage.from('avatars').remove(stale)
  return { url: data.publicUrl }
}

type Profile = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  is_private: boolean
  platforms: string[]
  username_changed_at: string | null
}

export function SettingsForm({
  profile,
  blocked,
}: {
  profile: Profile
  blocked: { id: string; username: string; avatarUrl: string | null }[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const fileInput = useRef<HTMLInputElement>(null)

  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url)
  const [displayName, setDisplayName] = useState(profile.display_name ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [username, setUsername] = useState(profile.username)
  const [isPrivate, setIsPrivate] = useState(profile.is_private)
  const [platforms, setPlatforms] = useState(profile.platforms)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [deleting, startDelete] = useTransition()

  const usernameUnlocksAt = profile.username_changed_at
    ? new Date(new Date(profile.username_changed_at).getTime() + USERNAME_COOLDOWN_DAYS * 86_400_000)
    : null
  const usernameLocked = usernameUnlocksAt != null && usernameUnlocksAt > new Date()

  // A3: máx. 2 MB, JPG/PNG/WebP. Se guarda en avatars/<uid>/ y se borran los anteriores.
  async function uploadAvatar(file: File) {
    if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) return toast.error('Usa una imagen JPG, PNG o WebP')
    if (file.size > AVATAR_MAX_BYTES) return toast.error('La imagen pesa más de 2 MB')

    setUploading(true)
    const result = await storeAvatar(profile.id, file)
    setUploading(false)
    if ('error' in result) return toast.error(result.error)
    setAvatarUrl(result.url)
    toast.success('Avatar actualizado')
    router.refresh()
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    const parsed = profileSchema.safeParse({ displayName, bio, isPrivate })
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? 'Revisa los datos')

    const changes: TablesUpdate<'profiles'> = {
      display_name: parsed.data.displayName,
      bio: parsed.data.bio || null,
      is_private: parsed.data.isPrivate,
      platforms,
    }
    if (username !== profile.username) {
      const parsedUsername = usernameSchema.safeParse(username)
      if (!parsedUsername.success) return toast.error(parsedUsername.error.issues[0]?.message ?? 'Nombre inválido')
      const { data: available } = await supabase.rpc('is_username_available', { candidate: parsedUsername.data })
      if (!available) return toast.error('Ese nombre de usuario ya está en uso')
      changes.username = parsedUsername.data
    }

    setSaving(true)
    const { error } = await supabase.from('profiles').update(changes).eq('id', profile.id)
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success('Perfil guardado')
    router.refresh()
  }

  async function unblock(userId: string, name: string) {
    const { error } = await supabase.from('blocks').delete().eq('blocker_id', profile.id).eq('blocked_id', userId)
    if (error) return toast.error(error.message)
    toast.success(`Desbloqueaste a @${name}`)
    router.refresh()
  }

  return (
    <div className="space-y-10">
      <form onSubmit={save} className="space-y-6">
        <section className="flex items-center gap-4">
          <UserAvatar username={profile.username} avatarUrl={avatarUrl} className="size-20" />
          <div className="space-y-1">
            <input
              ref={fileInput}
              type="file"
              accept={AVATAR_TYPES.join(',')}
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
            />
            <Button type="button" variant="outline" disabled={uploading} onClick={() => fileInput.current?.click()}>
              {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
              Cambiar avatar
            </Button>
            <p className="text-xs text-muted-foreground">JPG, PNG o WebP de hasta 2 MB.</p>
          </div>
        </section>

        <div className="space-y-1.5">
          <Label htmlFor="displayName">Nombre visible</Label>
          <Input id="displayName" value={displayName} maxLength={50} onChange={(e) => setDisplayName(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="username">Nombre de usuario</Label>
          <Input
            id="username"
            value={username}
            disabled={usernameLocked}
            maxLength={20}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
          />
          <p className="text-xs text-muted-foreground">
            {usernameLocked && usernameUnlocksAt
              ? `Podrás cambiarlo de nuevo el ${formatDate(usernameUnlocksAt)}.`
              : 'Puedes cambiarlo una vez cada 30 días.'}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" value={bio} maxLength={160} rows={3} onChange={(e) => setBio(e.target.value)} />
          <p className="text-right text-xs text-muted-foreground">{bio.length}/160</p>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Plataformas</legend>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((platform) => {
              const active = platforms.includes(platform)
              return (
                <Button
                  key={platform}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  aria-pressed={active}
                  onClick={() =>
                    setPlatforms(active ? platforms.filter((p) => p !== platform) : [...platforms, platform])
                  }
                >
                  {PLATFORM_LABELS[platform]}
                </Button>
              )
            })}
          </div>
        </fieldset>

        <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
          <div>
            <Label htmlFor="private">Perfil privado</Label>
            <p className="text-sm text-muted-foreground">
              Solo los seguidores que apruebes verán tus favoritos. Tu nombre y tus comentarios siguen siendo públicos.
            </p>
          </div>
          <Switch id="private" checked={isPrivate} onCheckedChange={setIsPrivate} />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            Guardar cambios
          </Button>
          <Button asChild variant="ghost">
            <Link href={`/u/${profile.username}`}>Ver mi perfil</Link>
          </Button>
        </div>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Usuarios bloqueados</h2>
        {blocked.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bloqueaste a nadie.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {blocked.map((user) => (
              <li key={user.id} className="flex items-center gap-3 p-3">
                <UserAvatar username={user.username} avatarUrl={user.avatarUrl} className="size-8" />
                <span className="flex-1">@{user.username}</span>
                <Button size="sm" variant="outline" onClick={() => unblock(user.id, user.username)}>
                  Desbloquear
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-lg border border-destructive/50 p-4">
        <h2 className="text-lg font-semibold text-destructive">Borrar cuenta</h2>
        <p className="text-sm text-muted-foreground">
          Se eliminan tu perfil, favoritos, comentarios, likes y seguidores. No se puede deshacer.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Borrar mi cuenta</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Borrar tu cuenta para siempre?</AlertDialogTitle>
              <AlertDialogDescription>
                Escribe <strong>{profile.username}</strong> para confirmar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} aria-label="Confirmación" />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={confirmation !== profile.username || deleting}
                onClick={(event) => {
                  event.preventDefault()
                  startDelete(async () => {
                    const result = await deleteAccount()
                    if (result?.error) toast.error(result.error)
                  })
                }}
              >
                Borrar definitivamente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  )
}
