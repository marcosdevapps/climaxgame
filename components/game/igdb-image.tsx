import Image from 'next/image'

import { type IgdbImageSize, igdbImageUrl } from '@/lib/igdb/images'

// El CDN de IGDB ya entrega WebP en el tamaño pedido: se sirve directo
// (unoptimized) para no gastar la cuota de optimización de imágenes de Vercel.
export function IgdbImage({
  imageId,
  size,
  alt,
  className,
  priority,
  sizes,
}: {
  imageId: string
  size: IgdbImageSize
  alt: string
  className?: string
  priority?: boolean
  sizes?: string
}) {
  return (
    <Image
      src={igdbImageUrl(imageId, size)}
      alt={alt}
      fill
      unoptimized
      priority={priority}
      sizes={sizes}
      className={className ?? 'object-cover'}
    />
  )
}
