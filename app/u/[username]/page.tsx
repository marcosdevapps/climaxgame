import { Lock } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { CommentCard } from '@/components/comments/comment-card'
import { GameCarousel, GameGrid } from '@/components/game/game-carousel'
import { FollowButton } from '@/components/profile/follow-button'
import { ProfileMenu } from '@/components/profile/profile-menu'
import { UserAvatar } from '@/components/profile/user-avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getUserComments } from '@/lib/data/comments'
import {
  getCommonGames,
  getConnections,
  getProfileByUsername,
  getProfileFavorites,
  type ProfilePage,
} from '@/lib/data/profiles'
import { cn } from '@/lib/utils'

const TABS = {
  favoritos: 'Favoritos',
  comentarios: 'Comentarios',
  seguidores: 'Seguidores',
  siguiendo: 'Siguiendo',
} as const
type Tab = keyof typeof TABS

const PLATFORM_LABELS: Record<string, string> = {
  pc: 'PC',
  playstation: 'PlayStation',
  xbox: 'Xbox',
  switch: 'Switch',
  mobile: 'Móvil',
}

type Props = { params: Promise<{ username: string }>; searchParams: Promise<{ tab?: string; orden?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  return { title: `@${username}`, alternates: { canonical: `/u/${username}` } }
}

export default function UserProfilePage({ params, searchParams }: Props) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Suspense fallback={<ProfileSkeleton />}>
        {Promise.all([params, searchParams]).then(([{ username }, { tab, orden }]) => (
          <Profile
            username={username}
            tab={tab && tab in TABS ? (tab as Tab) : 'favoritos'}
            sort={orden === 'nota' ? 'score' : 'added'}
          />
        ))}
      </Suspense>
    </div>
  )
}

async function Profile({ username, tab, sort }: { username: string; tab: Tab; sort: 'added' | 'score' }) {
  const profile = await getProfileByUsername(username)
  if (!profile) notFound()

  const common = profile.canViewFavorites ? await getCommonGames(profile.id) : []
  const counters: [Tab, string, number][] = [
    ['favoritos', 'Favoritos', profile.favorites_count],
    ['seguidores', 'Seguidores', profile.followers_count],
    ['siguiendo', 'Siguiendo', profile.following_count],
  ]

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 md:flex-row md:items-start">
        <UserAvatar username={profile.username} avatarUrl={profile.avatar_url} className="size-24 text-xl" />
        <div className="flex-1 space-y-2">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              {profile.display_name ?? profile.username}
              {profile.is_private && <Lock className="size-4 text-muted-foreground" aria-label="Perfil privado" />}
            </h1>
            <p className="text-muted-foreground">@{profile.username}</p>
          </div>
          {profile.bio && <p className="max-w-xl">{profile.bio}</p>}
          {profile.platforms.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Plataformas">
              {profile.platforms.map((p) => (
                <li key={p} className="rounded-md border px-2 py-0.5 text-xs">
                  {PLATFORM_LABELS[p] ?? p}
                </li>
              ))}
            </ul>
          )}
          <dl className="flex gap-5 pt-1 text-sm">
            {counters.map(([key, label, value]) => (
              <Link key={key} href={`/u/${profile.username}?tab=${key}`} className="hover:underline">
                <dd className="inline font-semibold tabular-nums">{value.toLocaleString('es')}</dd>{' '}
                <dt className="inline text-muted-foreground">{label}</dt>
              </Link>
            ))}
          </dl>
        </div>
        <div className="flex items-center gap-2">
          {profile.isOwn ? (
            <Button asChild variant="outline">
              <Link href="/ajustes">Editar perfil</Link>
            </Button>
          ) : (
            <>
              {!profile.blockedByMe && (
                <FollowButton
                  userId={profile.id}
                  username={profile.username}
                  initialStatus={profile.followStatus}
                  size="default"
                />
              )}
              <ProfileMenu userId={profile.id} username={profile.username} blocked={profile.blockedByMe} />
            </>
          )}
        </div>
      </header>

      {common.length > 0 && <GameCarousel title={`Juegos en común (${common.length})`} games={common} />}

      <nav
        className="flex [scrollbar-width:none] gap-1 overflow-x-auto overflow-y-hidden border-b"
        aria-label="Secciones del perfil"
      >
        {(Object.entries(TABS) as [Tab, string][]).map(([key, label]) => (
          <Link
            key={key}
            href={`/u/${profile.username}?tab=${key}`}
            aria-current={tab === key ? 'page' : undefined}
            className={cn(
              '-mb-px border-b-2 border-transparent px-3 py-2 text-sm whitespace-nowrap text-muted-foreground hover:text-foreground',
              tab === key && 'border-primary text-foreground',
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <ProfileTab profile={profile} tab={tab} sort={sort} />
      </Suspense>
    </div>
  )
}

async function ProfileTab({ profile, tab, sort }: { profile: ProfilePage; tab: Tab; sort: 'added' | 'score' }) {
  if (tab === 'favoritos') {
    if (!profile.canViewFavorites) {
      return (
        <EmptyState>
          <Lock className="mx-auto mb-2 size-6" />
          Este perfil es privado. Si te aprueba como seguidor, verás sus favoritos.
        </EmptyState>
      )
    }
    const games = await getProfileFavorites(profile.id, sort)
    if (games.length === 0) {
      return (
        <EmptyState>
          {profile.isOwn ? (
            <>
              Todavía no tienes favoritos. <Link href="/explorar/populares">Explora juegos populares</Link> y toca el
              corazón.
            </>
          ) : (
            'Todavía no agregó favoritos.'
          )}
        </EmptyState>
      )
    }
    return (
      <div className="space-y-4">
        <div className="flex gap-2 text-sm">
          <span className="text-muted-foreground">Ordenar:</span>
          <Link
            href={`/u/${profile.username}?tab=favoritos`}
            className={cn(sort === 'added' ? 'font-medium' : 'text-muted-foreground')}
          >
            Agregados recientemente
          </Link>
          <Link
            href={`/u/${profile.username}?tab=favoritos&orden=nota`}
            className={cn(sort === 'score' ? 'font-medium' : 'text-muted-foreground')}
          >
            Mejor nota
          </Link>
        </div>
        <GameGrid games={games} />
      </div>
    )
  }

  if (tab === 'comentarios') {
    const comments = await getUserComments(profile.id)
    if (comments.length === 0) return <EmptyState>Todavía no comentó ningún juego.</EmptyState>
    return (
      <ul className="space-y-3">
        {comments.map((comment) => (
          <li key={comment.id}>
            <CommentCard comment={comment} isOwn={profile.isOwn} />
          </li>
        ))}
      </ul>
    )
  }

  const people = await getConnections(profile.id, tab === 'seguidores' ? 'followers' : 'following')
  if (people.length === 0) {
    return (
      <EmptyState>{tab === 'seguidores' ? 'Todavía no tiene seguidores.' : 'Todavía no sigue a nadie.'}</EmptyState>
    )
  }
  return (
    <ul className="divide-y rounded-lg border">
      {people.map((person) => (
        <li key={person.id} className="flex items-center gap-3 p-3">
          <Link href={`/u/${person.username}`}>
            <UserAvatar username={person.username} avatarUrl={person.avatar_url} />
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/u/${person.username}`} className="block truncate font-medium hover:underline">
              {person.display_name ?? person.username}
            </Link>
            <p className="truncate text-xs text-muted-foreground">{person.bio ?? `@${person.username}`}</p>
          </div>
          <FollowButton userId={person.id} username={person.username} initialStatus={person.followStatus} />
        </li>
      ))}
    </ul>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground [&_a]:text-primary [&_a]:underline">
      {children}
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="flex gap-5">
      <Skeleton className="size-24 rounded-full" />
      <div className="flex-1 space-y-3">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  )
}
