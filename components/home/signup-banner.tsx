import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { getCurrentUserId } from '@/lib/data/session'

// Invitación discreta a registrarse, solo para visitantes.
export async function SignupBanner() {
  if (await getCurrentUserId()) return null

  return (
    <aside className="mb-10 flex flex-col items-start gap-3 rounded-xl border border-primary/40 bg-primary/10 p-5 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="font-semibold">Arma tu perfil gamer</p>
        <p className="text-sm text-muted-foreground">
          Guarda tus favoritos, opina en cada juego y descubre qué juegan las personas que sigues.
        </p>
      </div>
      <Button asChild>
        <Link href="?auth=signup" scroll={false}>
          Crear cuenta gratis
        </Link>
      </Button>
    </aside>
  )
}
