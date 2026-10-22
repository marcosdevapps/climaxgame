'use client'

import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { loadMoreFeed } from '@/app/actividad/actions'
import type { FeedItem } from '@/lib/data/feed'

import { FeedItemCard } from './feed-item'

// Al llegar al final de la lista se pide la siguiente página.
export function FeedList({ initialItems, initialCursor }: { initialItems: FeedItem[]; initialCursor: string | null }) {
  const [items, setItems] = useState(initialItems)
  const [cursor, setCursor] = useState(initialCursor)
  const [loading, setLoading] = useState(false)
  const sentinel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = sentinel.current
    if (!node || !cursor) return
    const observer = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting || loading) return
      setLoading(true)
      const page = await loadMoreFeed(cursor)
      setItems((prev) => [...prev, ...page.items.filter((i) => !prev.some((p) => p.key === i.key))])
      setCursor(page.nextCursor)
      setLoading(false)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [cursor, loading])

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.key}>
            <FeedItemCard item={item} />
          </li>
        ))}
      </ul>
      {cursor ? (
        <div ref={sentinel} className="flex justify-center py-4 text-muted-foreground">
          {loading && <Loader2 className="size-5 animate-spin" aria-label="Cargando más actividad" />}
        </div>
      ) : (
        items.length > 0 && <p className="py-4 text-center text-sm text-muted-foreground">Estás al día.</p>
      )}
    </div>
  )
}
