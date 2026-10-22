import type { Enums } from '@/lib/supabase/database.types'

export const REPORT_REASON_LABELS: Record<Enums<'report_reason'>, string> = {
  spam: 'Spam o publicidad',
  offensive: 'Ofensivo o acoso',
  spoiler: 'Spoiler sin aviso',
  other: 'Otro motivo',
}
