import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

import { FeedItemCard } from '@/components/feed/feed-item'
import { getFeed } from '@/lib/data/feed'

// "Actividad de tu red" en la home: solo con sesión y si sigue a alguien.
export async function NetworkActivity() {
  const { items } = await getFeed({ limit: 6 })
  if (items.length === 0) return null

  return (
    <section aria-labelledby="actividad-red" className="mb-10">
      <div className="mb-3 flex items-end justify-between">
        <h2 id="actividad-red" className="text-lg font-semibold md:text-xl">
          Actividad de tu red
        </h2>
        <Link href="/actividad" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
          Ver todo <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <li key={item.key}>
            <FeedItemCard item={item} compact />
          </li>
        ))}
      </ul>
    </section>
  )
}
