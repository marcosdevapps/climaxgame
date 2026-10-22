// Tamaños del CDN de IGDB que usa ClimaxGame. Se piden en WebP para ahorrar datos móviles.
export type IgdbImageSize =
  'thumb' | 'cover_small' | 'cover_big' | 'screenshot_med' | 'screenshot_big' | '720p' | '1080p'

export function igdbImageUrl(imageId: string, size: IgdbImageSize) {
  return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.webp`
}
