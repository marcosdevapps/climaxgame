import { z } from 'zod'

// Mismas reglas que los checks de la base (supabase/migrations): validar aquí da
// mensajes claros en el formulario; la base es la que garantiza.

const PROVISIONAL_USERNAME = /^user_[0-9a-f]{12}$/

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, 'Usa de 3 a 20 letras, números o guiones bajos')
  .refine((value) => !PROVISIONAL_USERNAME.test(value), 'Ese nombre de usuario está reservado')

export const passwordSchema = z.string().min(8, 'La contraseña debe tener al menos 8 caracteres')

export const signUpSchema = z.object({
  email: z.email('Ingresa un email válido'),
  password: passwordSchema,
  username: usernameSchema,
})

export const profileSchema = z.object({
  displayName: z.string().trim().min(1, 'Ingresa un nombre').max(50, 'Máximo 50 caracteres'),
  bio: z.string().trim().max(160, 'Máximo 160 caracteres'),
  isPrivate: z.boolean(),
})

export const PLATFORMS = ['pc', 'playstation', 'xbox', 'switch', 'mobile'] as const
export const platformsSchema = z.array(z.enum(PLATFORMS))

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export const commentSchema = z.object({
  body: z.string().trim().min(1, 'Escribe algo').max(1000, 'Máximo 1.000 caracteres'),
  isSpoiler: z.boolean().default(false),
})

export const REPORT_REASONS = ['spam', 'offensive', 'spoiler', 'other'] as const
export const reportSchema = z.object({
  reason: z.enum(REPORT_REASONS, 'Elige un motivo'),
  details: z.string().trim().max(500).optional(),
})
