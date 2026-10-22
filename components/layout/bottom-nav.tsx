'use client'

import { Activity, Home, Search, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

const ITEMS = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/buscar', label: 'Buscar', icon: Search },
  { href: '/actividad', label: 'Actividad', icon: Activity },
  { href: '/ajustes', label: 'Perfil', icon: User },
]

// Navegación inferior solo en móvil, donde llega la mayor parte del tráfico.
export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-4">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-14 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground',
                  active && 'text-primary',
                )}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
