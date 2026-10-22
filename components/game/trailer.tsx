'use client'

import { Play } from 'lucide-react'
import { useState } from 'react'

// Muestra la miniatura y carga el reproductor de YouTube solo al hacer clic:
// ahorra datos móviles y no frena la carga de la ficha.
export function Trailer({ videoId, title }: { videoId: string; title: string }) {
  const [playing, setPlaying] = useState(false)

  if (playing) {
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
        title={`Tráiler de ${title}`}
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="aspect-video w-full rounded-lg"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="group relative aspect-video w-full overflow-hidden rounded-lg bg-muted"
      aria-label={`Reproducir tráiler de ${title}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- miniatura externa de YouTube */}
      <img
        src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover opacity-80 transition group-hover:opacity-100"
      />
      <span className="absolute inset-0 m-auto flex size-14 items-center justify-center rounded-full bg-black/70 text-white">
        <Play className="size-6 fill-current" aria-hidden />
      </span>
    </button>
  )
}
