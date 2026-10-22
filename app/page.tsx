import { Skeleton } from '@/components/ui/skeleton'

// Home provisoria del sprint 1. El sprint 2 la reemplaza con el hero y los
// carruseles alimentados desde el catálogo de IGDB (historia D1).
const SECTIONS = ['Populares ahora', 'Recién lanzados', 'Próximamente']

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="mb-10 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Tu red gamer en <span className="text-primary">español</span>
        </h1>
        <p className="mt-3 text-muted-foreground">
          Descubre qué salió, qué viene y qué es popular. Guarda tus favoritos, opina en cada juego y sigue a jugadores
          con tus mismos gustos.
        </p>
      </section>

      {SECTIONS.map((title) => (
        <section key={title} className="mb-8" aria-label={title}>
          <h2 className="mb-3 text-lg font-semibold">{title}</h2>
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="aspect-[3/4] w-32 shrink-0 rounded-lg md:w-40" />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
