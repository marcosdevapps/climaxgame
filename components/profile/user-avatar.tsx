import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export function UserAvatar({
  username,
  avatarUrl,
  className,
}: {
  username: string
  avatarUrl: string | null
  className?: string
}) {
  return (
    <Avatar className={cn('size-10', className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
      <AvatarFallback className="bg-primary/20 text-xs font-semibold">
        {username.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  )
}
