import Link from 'next/link'

export function Footer() {
  return (
    <footer className="mt-12 border-t pb-20 md:pb-0">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>
          ClimaxGame · Datos de juegos por{' '}
          <a href="https://www.igdb.com" target="_blank" rel="noreferrer" className="underline">
            IGDB.com
          </a>
        </p>
        <nav className="flex gap-4">
          <Link href="/legal/terminos" className="hover:text-foreground">
            Términos
          </Link>
          <Link href="/legal/privacidad" className="hover:text-foreground">
            Privacidad
          </Link>
        </nav>
      </div>
    </footer>
  )
}
