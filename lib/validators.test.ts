import { describe, expect, it } from 'vitest'

import { igdbImageUrl } from './igdb/images'
import { safeNextPath } from './safe-redirect'
import { commentSchema, reportSchema, signUpSchema, usernameSchema } from './validators'

describe('usernameSchema', () => {
  it('normaliza a minúsculas', () => {
    expect(usernameSchema.parse('  Alice_GG ')).toBe('alice_gg')
  })

  it.each(['ab', 'nombre-con-guion', 'muy_largo_para_ser_valido', 'user_0123456789ab'])('rechaza %s', (value) => {
    expect(usernameSchema.safeParse(value).success).toBe(false)
  })
})

describe('signUpSchema', () => {
  it('exige contraseña de 8+ caracteres', () => {
    const result = signUpSchema.safeParse({ email: 'a@b.com', password: '1234567', username: 'gamer' })
    expect(result.success).toBe(false)
  })
})

describe('commentSchema', () => {
  it('rechaza comentarios vacíos y de más de 1.000 caracteres', () => {
    expect(commentSchema.safeParse({ body: '   ' }).success).toBe(false)
    expect(commentSchema.safeParse({ body: 'x'.repeat(1001) }).success).toBe(false)
    expect(commentSchema.parse({ body: ' Gran juego ' })).toEqual({ body: 'Gran juego', isSpoiler: false })
  })
})

describe('reportSchema', () => {
  it('exige un motivo válido', () => {
    expect(reportSchema.safeParse({}).success).toBe(false)
    expect(reportSchema.safeParse({ reason: 'spoiler' }).success).toBe(true)
  })
})

describe('safeNextPath', () => {
  it.each([
    ['/juego/hades', '/juego/hades'],
    ['https://malicioso.com', '/'],
    ['//malicioso.com', '/'],
    ['/\\malicioso.com', '/'],
    [null, '/'],
  ])('%s → %s', (next, expected) => {
    expect(safeNextPath(next)).toBe(expected)
  })
})

describe('igdbImageUrl', () => {
  it('pide WebP del tamaño indicado', () => {
    expect(igdbImageUrl('co1abc', 'cover_big')).toBe(
      'https://images.igdb.com/igdb/image/upload/t_cover_big/co1abc.webp',
    )
  })
})
