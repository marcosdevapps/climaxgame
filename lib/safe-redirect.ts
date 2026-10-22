// Evita redirecciones abiertas: solo rutas internas como "/juego/hades".
export function safeNextPath(next: string | null | undefined, fallback = '/') {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return fallback
  }
  return next
}
