// Nombres cortos para las plataformas más comunes de IGDB (por slug).
const SHORT_NAMES: Record<string, string> = {
  win: 'PC',
  mac: 'Mac',
  linux: 'Linux',
  ps5: 'PS5',
  'ps4--1': 'PS4',
  ps3: 'PS3',
  'series-x-s': 'Xbox Series X|S',
  xboxone: 'Xbox One',
  xbox360: 'Xbox 360',
  switch: 'Switch',
  'switch-2': 'Switch 2',
  android: 'Android',
  ios: 'iOS',
  'meta-quest-3': 'Meta Quest 3',
  stadia: 'Stadia',
}

export function platformLabel(platform: { slug: string; name: string }) {
  return SHORT_NAMES[platform.slug] ?? platform.name
}

// Las plataformas principales primero (PC, consolas actuales, móvil).
const ORDER = Object.keys(SHORT_NAMES)
export function sortPlatforms<T extends { slug: string }>(platforms: T[]) {
  const rank = (slug: string) => {
    const index = ORDER.indexOf(slug)
    return index === -1 ? ORDER.length : index
  }
  return [...platforms].sort((a, b) => rank(a.slug) - rank(b.slug))
}
