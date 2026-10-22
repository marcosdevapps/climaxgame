import { getCurrentProfile, isModerator } from '@/lib/data/session'

import { LoginButton, UserMenuDropdown } from './user-menu-dropdown'

// Lee la sesión del request: va dentro de <Suspense> para no bloquear la página cacheada.
export async function UserMenu() {
  const profile = await getCurrentProfile()
  if (!profile) return <LoginButton />

  return (
    <UserMenuDropdown
      username={profile.username}
      displayName={profile.display_name ?? profile.username}
      avatarUrl={profile.avatar_url}
      moderator={isModerator(profile)}
    />
  )
}
