'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'
import { signUpSchema } from '@/lib/validators'

// Mensajes de Supabase Auth en español.
function authErrorMessage(message: string) {
  if (/invalid login credentials/i.test(message)) return 'Email o contraseña incorrectos'
  if (/email not confirmed/i.test(message)) return 'Confirma tu email antes de ingresar (revisa tu bandeja de entrada)'
  if (/already registered|already exists/i.test(message)) return 'Ese email ya tiene una cuenta. Prueba ingresando.'
  if (/rate limit|too many/i.test(message)) return 'Demasiados intentos. Espera unos minutos y vuelve a probar.'
  if (/password/i.test(message)) return 'La contraseña no cumple los requisitos (mínimo 8 caracteres)'
  return message
}

// Modal de registro/ingreso: se abre con ?auth=login o ?auth=signup para no sacar
// al usuario de lo que estaba viendo (plan de producto, "Registro y onboarding").
export function AuthModal() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const mode = searchParams.get('auth')
  const open = mode === 'login' || mode === 'signup' || mode === 'error'

  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const nextPath = searchParams.get('next') ?? pathname

  function close() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('auth')
    params.delete('next')
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    setError(null)
    setNotice(null)
  }

  async function afterSignIn() {
    const supabase = createClient()
    const { data } = await supabase.auth.getClaims()
    const userId = data?.claims.sub
    const { data: profile } = userId
      ? await supabase.from('profiles').select('onboarding_completed_at').eq('id', userId).single()
      : { data: null }
    close()
    if (profile && !profile.onboarding_completed_at) {
      router.push(`/onboarding?next=${encodeURIComponent(nextPath)}`)
    } else {
      router.refresh()
    }
  }

  async function signInWithGoogle() {
    setPending(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}` },
    })
    if (error) {
      setError(authErrorMessage(error.message))
      setPending(false)
    }
  }

  async function signIn(formData: FormData) {
    setPending(true)
    setError(null)
    const { error } = await createClient().auth.signInWithPassword({
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
    })
    setPending(false)
    if (error) return setError(authErrorMessage(error.message))
    await afterSignIn()
  }

  async function signUp(formData: FormData) {
    setError(null)
    const parsed = signUpSchema.safeParse({
      email: formData.get('email'),
      password: formData.get('password'),
      username: formData.get('username'),
    })
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Revisa los datos')

    setPending(true)
    const supabase = createClient()
    const { data: available } = await supabase.rpc('is_username_available', { candidate: parsed.data.username })
    if (!available) {
      setPending(false)
      return setError('Ese nombre de usuario ya está en uso')
    }

    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { username: parsed.data.username },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/onboarding')}`,
      },
    })
    setPending(false)
    if (error) return setError(authErrorMessage(error.message))
    if (data.session) return afterSignIn()
    setNotice(`Te enviamos un email a ${parsed.data.email}. Abre el enlace para activar tu cuenta.`)
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Únete a ClimaxGame</DialogTitle>
          <DialogDescription>
            Guarda tus juegos favoritos, opina y sigue a jugadores con tus mismos gustos.
          </DialogDescription>
        </DialogHeader>

        {mode === 'error' && !error && (
          <p className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            No pudimos completar el ingreso. Vuelve a intentarlo.
          </p>
        )}

        <Button type="button" size="lg" variant="secondary" disabled={pending} onClick={signInWithGoogle}>
          <GoogleIcon />
          Continuar con Google
        </Button>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />o con tu email
          <span className="h-px flex-1 bg-border" />
        </div>

        {notice ? (
          <p className="rounded-md bg-primary/15 p-3 text-sm">{notice}</p>
        ) : (
          <Tabs defaultValue={mode === 'login' ? 'login' : 'signup'} onValueChange={() => setError(null)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
              <TabsTrigger value="login">Ingresar</TabsTrigger>
            </TabsList>

            <TabsContent value="signup">
              <form action={signUp} className="space-y-3 pt-2">
                <Field id="username" label="Nombre de usuario" autoComplete="username" placeholder="tu_nombre" />
                <Field id="email" label="Email" type="email" autoComplete="email" />
                <Field
                  id="password"
                  label="Contraseña (mínimo 8 caracteres)"
                  type="password"
                  autoComplete="new-password"
                />
                <Button type="submit" className="w-full" disabled={pending}>
                  Crear cuenta
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="login">
              <form action={signIn} className="space-y-3 pt-2">
                <Field id="email" label="Email" type="email" autoComplete="email" />
                <Field id="password" label="Contraseña" type="password" autoComplete="current-password" />
                <Button type="submit" className="w-full" disabled={pending}>
                  Ingresar
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Al continuar aceptas los{' '}
          <a href="/legal/terminos" className="underline">
            términos
          </a>{' '}
          y la{' '}
          <a href="/legal/privacidad" className="underline">
            política de privacidad
          </a>
          .
        </p>
      </DialogContent>
    </Dialog>
  )
}

function Field({ id, label, ...props }: { id: string; label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} required {...props} />
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.3 6.6 2.3 12s4.3 9.8 9.7 9.8c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  )
}
