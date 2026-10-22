import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { GameGrid } from '@/components/game/game-carousel'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getSectionPage, type SectionKey, SECTIONS } from '@/lib/data/catalog'

type Props = { params: Promise<{ seccion: string }>; searchParams: Promise<{ pagina?: string }> }

const isSection = (value: string): value is SectionKey => value in SECTIONS

export function generateStaticParams() {
  return Object.keys(SECTIONS).map((seccion) => ({ seccion }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { seccion } = await params
  return { title: isSection(seccion) ? SECTIONS[seccion] : 'Explorar' }
}

export default async function ExplorePage({ params, searchParams }: Props) {
  const { seccion } = await params
  if (!isSection(seccion)) notFound()

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <nav className="mb-6 flex gap-2 overflow-x-auto" aria-label="Secciones">
        {(Object.entries(SECTIONS) as [SectionKey, string][]).map(([key, label]) => (
          <Button key={key} asChild size="sm" variant={key === seccion ? 'default' : 'outline'}>
            <Link href={`/explorar/${key}`}>{label}</Link>
          </Button>
        ))}
      </nav>
      <h1 className="mb-6 text-2xl font-bold">{SECTIONS[seccion]}</h1>
      <Suspense fallback={<GridSkeleton />}>
        {searchParams.then(({ pagina }) => (
          <SectionResults section={seccion} page={Math.max(1, Number(pagina) || 1)} />
        ))}
      </Suspense>
    </div>
  )
}

async function SectionResults({ section, page }: { section: SectionKey; page: number }) {
  const { games, hasNext } = await getSectionPage(section, page)
  if (games.length === 0) return <p className="text-muted-foreground">No hay juegos en esta sección por ahora.</p>

  return (
    <>
      <GameGrid games={games} countdown={section === 'proximos'} />
      <div className="mt-8 flex justify-center gap-3">
        {page > 1 && (
          <Button asChild variant="outline">
            <Link href={`/explorar/${section}?pagina=${page - 1}`}>Anterior</Link>
          </Button>
        )}
        {hasNext && (
          <Button asChild variant="outline">
            <Link href={`/explorar/${section}?pagina=${page + 1}`}>Siguiente</Link>
          </Button>
        )}
      </div>
    </>
  )
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: 12 }, (_, i) => (
        <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
      ))}
    </div>
  )
}
