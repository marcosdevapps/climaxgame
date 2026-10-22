import type { MetadataRoute } from 'next'

import { getAllGameSlugs, SECTIONS } from '@/lib/data/catalog'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

// Las fichas de juego son las páginas que más tráfico orgánico pueden traer.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const games = await getAllGameSlugs()
  return [
    { url: SITE, changeFrequency: 'hourly', priority: 1 },
    ...Object.keys(SECTIONS).map((section) => ({
      url: `${SITE}/explorar/${section}`,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
    ...games.map((game) => ({
      url: `${SITE}/juego/${game.slug}`,
      lastModified: game.synced_at,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
