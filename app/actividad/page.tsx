import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { FeedList } from '@/components/feed/feed-list'
import { NotificationList } from '@/components/notifications/notification-list'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getFeed } from '@/lib/data/feed'
import { getNotifications } from '@/lib/data/notifications'
import { getCurrentUserId } from '@/lib/data/session'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Actividad', robots: { index: false } }

type Props = { searchParams: Promise<{ tab?: string }> }

export default function ActivityPage({ searchParams }: Props) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold">Actividad</h1>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        {searchParams.then(({ tab }) => (
          <Activity tab={tab === 'notificaciones' ? 'notifications' : 'feed'} />
        ))}
      </Suspense>
    </div>
  )
}

async function Activity({ tab }: { tab: 'feed' | 'notifications' }) {
  const me = await getCurrentUserId()
  if (!me) redirect('/?auth=login&next=%2Factividad')

  return (
    <>
      <nav className="mb-6 flex gap-1 border-b" aria-label="Secciones de actividad">
        {(
          [
            ['feed', 'Tu red', '/actividad'],
            ['notifications', 'Notificaciones', '/actividad?tab=notificaciones'],
          ] as const
        ).map(([key, label, href]) => (
          <Link
            key={key}
            href={href}
            aria-current={tab === key ? 'page' : undefined}
            className={cn(
              '-mb-px border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground',
              tab === key && 'border-primary text-foreground',
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      {tab === 'feed' ? <Feed /> : <Notifications />}
    </>
  )
}

async function Feed() {
  const { items, nextCursor, followingCount } = await getFeed()

  if (followingCount === 0) {
    return (
      <div className="space-y-3 rounded-lg border border-dashed p-8 text-center">
        <p className="font-medium">Todavía no sigues a nadie</p>
        <p className="text-sm text-muted-foreground">
          Sigue a otros jugadores desde sus comentarios o perfiles y aquí verás qué agregan a favoritos y qué opinan.
        </p>
        <Button asChild variant="outline">
          <Link href="/explorar/populares">Explorar juegos populares</Link>
        </Button>
      </div>
    )
  }
  if (items.length === 0) {
    return <p className="text-center text-muted-foreground">Las personas que sigues todavía no tienen actividad.</p>
  }
  return <FeedList initialItems={items} initialCursor={nextCursor} />
}

async function Notifications() {
  const notifications = await getNotifications()
  return <NotificationList notifications={notifications} />
}
