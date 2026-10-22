'use client'

import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase/client'
import { hasSupabaseEnv } from '@/lib/supabase/env'

// Acción que un visitante intentó hacer antes de registrarse. Se guarda y se
// completa automáticamente al volver con sesión (Flujo 1 del plan de producto).
export type PendingAction =
  | { type: 'favorite'; gameId: number }
  | { type: 'like'; commentId: number }
  | { type: 'follow'; userId: string; username: string }

const PENDING_KEY = 'climaxgame:pending-action'

type AuthMode = 'login' | 'signup'

type SessionContextValue = {
  userId: string | null
  ready: boolean
  favoriteIds: ReadonlySet<number>
  // Devuelve el nuevo estado, o null si no se hizo (sin sesión o error).
  toggleFavorite: (gameId: number) => Promise<boolean | null>
  // true si hay sesión; si no, guarda la acción y abre el registro.
  requireAuth: (action?: PendingAction) => boolean
  openAuth: (mode?: AuthMode) => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession() {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession debe usarse dentro de <SessionProvider>')
  return value
}

function readPending(): PendingAction | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    sessionStorage.removeItem(PENDING_KEY)
    return raw ? (JSON.parse(raw) as PendingAction) : null
  } catch {
    return null
  }
}

const isDuplicate = (error: { code?: string } | null) => error?.code === '23505'

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const enabled = hasSupabaseEnv()
  const supabase = useMemo(() => (enabled ? createClient() : null), [enabled])

  const [userId, setUserId] = useState<string | null>(null)
  const [ready, setReady] = useState(!enabled)
  const [favoriteIds, setFavoriteIds] = useState<ReadonlySet<number>>(new Set())
  const runningPending = useRef(false)

  const loadFavorites = useCallback(
    async (uid: string) => {
      if (!supabase) return
      const { data } = await supabase.from('favorites').select('game_id').eq('user_id', uid).limit(2000)
      setFavoriteIds(new Set((data ?? []).map((row) => row.game_id)))
    },
    [supabase],
  )

  const runPending = useCallback(
    async (uid: string) => {
      if (!supabase || runningPending.current) return
      const action = readPending()
      if (!action) return
      runningPending.current = true
      try {
        if (action.type === 'favorite') {
          const { error } = await supabase.from('favorites').insert({ user_id: uid, game_id: action.gameId })
          if (error && !isDuplicate(error)) throw error
          setFavoriteIds((prev) => new Set(prev).add(action.gameId))
          toast.success('Agregado a tus favoritos')
        } else if (action.type === 'like') {
          const { error } = await supabase.from('comment_likes').insert({ user_id: uid, comment_id: action.commentId })
          if (error && !isDuplicate(error)) throw error
          toast.success('Te gusta este comentario')
        } else {
          const { error } = await supabase.from('follows').insert({ follower_id: uid, following_id: action.userId })
          if (error && !isDuplicate(error)) throw error
          toast.success(`Ahora sigues a @${action.username}`)
        }
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No pudimos completar la acción')
      } finally {
        runningPending.current = false
      }
    },
    [router, supabase],
  )

  useEffect(() => {
    if (!supabase) return
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const uid = session?.user.id ?? null
      setUserId(uid)
      setReady(true)
      if (!uid) {
        setFavoriteIds(new Set())
        return
      }
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        // Fuera del callback: Supabase recomienda no llamar a la API dentro de él.
        setTimeout(() => {
          void loadFavorites(uid)
          void runPending(uid)
        }, 0)
      }
    })
    return () => data.subscription.unsubscribe()
  }, [supabase, loadFavorites, runPending])

  const openAuth = useCallback(
    (mode: AuthMode = 'login') => {
      // Se lee de window (solo corre en clics): usePathname aquí haría dinámica toda la app.
      const params = new URLSearchParams(window.location.search)
      params.set('auth', mode)
      router.push(`${window.location.pathname}?${params}`, { scroll: false })
    },
    [router],
  )

  const requireAuth = useCallback(
    (action?: PendingAction) => {
      if (userId) return true
      if (action) {
        try {
          sessionStorage.setItem(PENDING_KEY, JSON.stringify(action))
        } catch {
          // Sin sessionStorage (modo privado estricto): solo se abre el registro.
        }
      }
      openAuth('signup')
      return false
    },
    [openAuth, userId],
  )

  const toggleFavorite = useCallback(
    async (gameId: number) => {
      if (!supabase || !requireAuth({ type: 'favorite', gameId }) || !userId) return null

      const next = !favoriteIds.has(gameId)
      const apply = (add: boolean) =>
        setFavoriteIds((prev) => {
          const copy = new Set(prev)
          if (add) copy.add(gameId)
          else copy.delete(gameId)
          return copy
        })

      apply(next)
      const { error } = next
        ? await supabase.from('favorites').insert({ user_id: userId, game_id: gameId })
        : await supabase.from('favorites').delete().eq('user_id', userId).eq('game_id', gameId)

      if (error && !isDuplicate(error)) {
        apply(!next)
        toast.error(error.message)
        return null
      }
      return next
    },
    [favoriteIds, requireAuth, supabase, userId],
  )

  const value = useMemo(
    () => ({ userId, ready, favoriteIds, toggleFavorite, requireAuth, openAuth }),
    [userId, ready, favoriteIds, toggleFavorite, requireAuth, openAuth],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
