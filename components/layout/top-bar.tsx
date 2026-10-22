import { Search } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

import { Skeleton } from '@/components/ui/skeleton'

import { NotificationBell } from './notification-bell'
import { UserMenu } from './user-menu'

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Climax<span className="text-primary">Game</span>
        </Link>

        <nav className="hidden items-center gap-4 text-sm text-muted-foreground md:flex">
          <Link href="/explorar/populares" className="hover:text-foreground">
            Explorar
          </Link>
        </nav>

        <Link
          href="/buscar"
          className="ml-auto hidden h-9 w-full max-w-xs items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground hover:text-foreground md:flex"
        >
          <Search className="size-4" aria-hidden />
          Buscar juegos
        </Link>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Suspense fallback={null}>
            <NotificationBell />
          </Suspense>
          <Suspense fallback={<Skeleton className="size-8 rounded-full" />}>
            <UserMenu />
          </Suspense>
        </div>
      </div>
    </header>
  )
}
