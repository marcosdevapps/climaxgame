'use server'

import { getFeed } from '@/lib/data/feed'

// Siguiente página del feed (paginación infinita).
export async function loadMoreFeed(before: string) {
  const { items, nextCursor } = await getFeed({ before })
  return { items, nextCursor }
}
