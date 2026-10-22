'use server'

import { redirect } from 'next/navigation'

import { getCurrentUserId } from '@/lib/data/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// Borra la cuenta con todos sus datos: la cascada de la base elimina perfil,
// favoritos, comentarios, likes, follows, bloqueos, reportes y notificaciones.
export async function deleteAccount(): Promise<{ error: string }> {
  const userId = await getCurrentUserId()
  if (!userId) return { error: 'Tu sesión expiró. Vuelve a ingresar.' }
  if (!process.env.SUPABASE_SECRET_KEY) {
    return { error: 'El borrado de cuentas no está configurado en este entorno (falta SUPABASE_SECRET_KEY).' }
  }

  const admin = createAdminClient()
  const { data: files } = await admin.storage.from('avatars').list(userId)
  if (files && files.length > 0) {
    await admin.storage.from('avatars').remove(files.map((file) => `${userId}/${file.name}`))
  }

  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return { error: `No pudimos borrar la cuenta: ${error.message}` }

  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/?cuenta=borrada')
}
