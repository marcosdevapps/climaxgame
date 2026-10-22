import Link from 'next/link'

import { UserAvatar } from '@/components/profile/user-avatar'
import { getFollowingIds } from '@/lib/data/feed'
import { getCurrentUserId } from '@/lib/data/session'
import { createClient } from '@/lib/supabase/server'

const MAX_SHOWN = 8

// "Amigos que lo tienen en favoritos": personas que sigo y guardaron este juego.
export async function FriendsWhoFavorited({ gameId }: { gameId: number }) {
  const me = await getCurrentUserId()
  if (!me) return null
  const following = await getFollowingIds(me)
  if (following.length === 0) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from('favorites')
    .select('profiles!favorites_user_id_fkey(username, display_name, avatar_url)')
    .eq('game_id', gameId)
    .in('user_id', following)
    .limit(50)
  const friends = (data ?? []).flatMap((row) => (row.profiles ? [row.profiles] : []))
  if (friends.length === 0) return null

  const names = friends.slice(0, 2).map((f) => f.display_name ?? f.username)
  const rest = friends.length - names.length

  return (
    <aside className="mb-6 flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
      <ul className="flex -space-x-2">
        {friends.slice(0, MAX_SHOWN).map((f) => (
          <li key={f.username}>
            <Link href={`/u/${f.username}`} title={`@${f.username}`}>
              <UserAvatar username={f.username} avatarUrl={f.avatar_url} className="size-8 ring-2 ring-background" />
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-sm">
        <span className="font-medium">{names.join(' y ')}</span>
        {rest > 0 && ` y ${rest} ${rest === 1 ? 'persona más' : 'personas más'}`} que sigues lo{' '}
        {friends.length === 1 ? 'tiene' : 'tienen'} en favoritos
      </p>
    </aside>
  )
}
