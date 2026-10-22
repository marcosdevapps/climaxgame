'use client'

import { Check, Gamepad2, Monitor, Smartphone } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { IgdbImage } from '@/components/game/igdb-image'
import { FollowButton } from '@/components/profile/follow-button'
import { UserAvatar } from '@/components/profile/user-avatar'
import { useSession } from '@/components/providers/session-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { GameCardData } from '@/lib/data/catalog'
import type { ProfileSummary } from '@/lib/data/social'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { PLATFORMS, usernameSchema } from '@/lib/validators'

const PLATFORM_LABELS: Record<(typeof PLATFORMS)[number], { label: string; icon: typeof Monitor }> = {
  pc: { label: 'PC', icon: Monitor },
  playstation: { label: 'PlayStation', icon: Gamepad2 },
  xbox: { label: 'Xbox', icon: Gamepad2 },
  switch: { label: 'Switch', icon: Gamepad2 },
  mobile: { label: 'Móvil', icon: Smartphone },
}

const PROVISIONAL = /^user_[0-9a-f]{12}$/
const MIN_FAVORITES = 3
const STEPS = ['Tu nombre', 'Plataformas', 'Juegos', 'Personas'] as const

// Onboarding corto (A2): nombre de usuario, plataformas, 3+ favoritos (se puede
// saltar) y sugerencias de usuarios para seguir.
export function OnboardingFlow({
  userId,
  currentUsername,
  currentPlatforms,
  games,
  suggestions,
  next,
}: {
  userId: string
  currentUsername: string
  currentPlatforms: string[]
  games: GameCardData[]
  suggestions: ProfileSummary[]
  next: string
}) {
  const router = useRouter()
  const { favoriteIds, toggleFavorite } = useSession()
  const supabase = createClient()

  const [step, setStep] = useState(0)
  const [username, setUsername] = useState(PROVISIONAL.test(currentUsername) ? '' : currentUsername)
  const [platforms, setPlatforms] = useState<string[]>(currentPlatforms)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const chosen = games.filter((g) => favoriteIds.has(g.id)).length

  async function saveUsername() {
    setError(null)
    const parsed = usernameSchema.safeParse(username)
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Nombre inválido')
    if (parsed.data !== currentUsername) {
      setBusy(true)
      const { data: available } = await supabase.rpc('is_username_available', { candidate: parsed.data })
      if (!available) {
        setBusy(false)
        return setError('Ese nombre de usuario ya está en uso')
      }
      const { error } = await supabase.from('profiles').update({ username: parsed.data }).eq('id', userId)
      setBusy(false)
      if (error) return setError(error.message)
    }
    setStep(1)
  }

  async function savePlatforms() {
    setBusy(true)
    const { error } = await supabase.from('profiles').update({ platforms }).eq('id', userId)
    setBusy(false)
    if (error) return toast.error(error.message)
    setStep(2)
  }

  async function finish() {
    setBusy(true)
    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq('id', userId)
    setBusy(false)
    if (error) return toast.error(error.message)
    toast.success('¡Listo! Tu perfil gamer está armado')
    router.push(next)
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <ol className="flex gap-2" aria-label="Pasos">
        {STEPS.map((label, index) => (
          <li
            key={label}
            aria-current={index === step ? 'step' : undefined}
            className={cn('h-1.5 flex-1 rounded-full bg-muted', index <= step && 'bg-primary')}
          >
            <span className="sr-only">{label}</span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section className="space-y-4">
          <h1 className="text-2xl font-bold">Elige tu nombre de usuario</h1>
          <p className="text-muted-foreground">
            Es tu dirección pública: climaxgame.vercel.app/u/<strong>{username || 'tu_nombre'}</strong>
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="username">Nombre de usuario</Label>
            <Input
              id="username"
              value={username}
              autoFocus
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="tu_nombre"
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground">De 3 a 20 letras, números o guiones bajos.</p>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button onClick={saveUsername} disabled={busy}>
            Continuar
          </Button>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-4">
          <h1 className="text-2xl font-bold">¿Dónde juegas?</h1>
          <p className="text-muted-foreground">Elige todas las que uses. Puedes cambiarlas después.</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((platform) => {
              const { label, icon: Icon } = PLATFORM_LABELS[platform]
              const active = platforms.includes(platform)
              return (
                <Button
                  key={platform}
                  type="button"
                  variant={active ? 'default' : 'outline'}
                  aria-pressed={active}
                  onClick={() =>
                    setPlatforms((prev) => (active ? prev.filter((p) => p !== platform) : [...prev, platform]))
                  }
                >
                  <Icon /> {label}
                </Button>
              )
            })}
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep(0)}>
              Atrás
            </Button>
            <Button onClick={savePlatforms} disabled={busy}>
              Continuar
            </Button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <h1 className="text-2xl font-bold">Elige al menos 3 juegos favoritos</h1>
          <p className="text-muted-foreground">
            Así tu perfil no queda vacío y te sugerimos gente con gustos parecidos.{' '}
            <span className="font-medium text-foreground">
              Elegiste {chosen} de {MIN_FAVORITES}
            </span>
          </p>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {games.map((game) => {
              const active = favoriteIds.has(game.id)
              return (
                <li key={game.id}>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(game.id)}
                    aria-pressed={active}
                    className={cn(
                      'relative block aspect-[3/4] w-full overflow-hidden rounded-lg border-2 border-transparent bg-muted transition',
                      active && 'border-primary',
                    )}
                  >
                    {game.cover_image_id && (
                      <IgdbImage imageId={game.cover_image_id} size="cover_big" alt={game.title} sizes="160px" />
                    )}
                    {active && (
                      <span className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-4" />
                      </span>
                    )}
                  </button>
                  <p className="mt-1 line-clamp-1 text-xs">{game.title}</p>
                </li>
              )
            })}
          </ul>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep(3)}>
              Omitir
            </Button>
            <Button onClick={() => setStep(3)} disabled={chosen < MIN_FAVORITES}>
              Continuar
            </Button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4">
          <h1 className="text-2xl font-bold">Personas que te pueden interesar</h1>
          <p className="text-muted-foreground">Sigue a quien quieras: su actividad aparecerá en tu inicio.</p>
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay sugerencias. ¡Eres de los primeros!</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {suggestions.map((user) => (
                <li key={user.id} className="flex items-center gap-3 p-3">
                  <UserAvatar username={user.username} avatarUrl={user.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{user.display_name ?? user.username}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.bio ?? `@${user.username}`}</p>
                  </div>
                  <FollowButton
                    userId={user.id}
                    username={user.username}
                    initialStatus="none"
                    refreshOnChange={false}
                  />
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep(2)}>
              Atrás
            </Button>
            <Button onClick={finish} disabled={busy}>
              Terminar
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
