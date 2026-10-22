'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { useSession } from '@/components/providers/session-provider'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { REPORT_REASON_LABELS } from '@/lib/labels'
import { createClient } from '@/lib/supabase/client'
import { REPORT_REASONS, reportSchema } from '@/lib/validators'

// Reporte con motivo obligatorio (C3). Con 3 reportes de usuarios distintos el
// comentario se oculta automáticamente hasta que lo revise un moderador.
export function ReportDialog({ commentId, onClose }: { commentId: number; onClose: () => void }) {
  const { userId } = useSession()
  const [reason, setReason] = useState<string>('')
  const [details, setDetails] = useState('')
  const [sending, setSending] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const parsed = reportSchema.safeParse({ reason, details: details || undefined })
    if (!parsed.success || !userId) return toast.error('Elige un motivo')

    setSending(true)
    const { error } = await createClient()
      .from('reports')
      .insert({ reporter_id: userId, comment_id: commentId, reason: parsed.data.reason, details: parsed.data.details })
    setSending(false)
    if (error?.code === '23505') {
      toast.info('Ya habías reportado este comentario')
    } else if (error) {
      return toast.error(error.message)
    } else {
      toast.success('Gracias. Revisaremos el comentario.')
    }
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reportar comentario</DialogTitle>
          <DialogDescription>Cuéntanos qué pasa. Los reportes son anónimos.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="sr-only">Motivo</legend>
            {REPORT_REASONS.map((value) => (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm has-checked:border-primary"
              >
                <input
                  type="radio"
                  name="reason"
                  value={value}
                  checked={reason === value}
                  onChange={() => setReason(value)}
                  className="accent-primary"
                />
                {REPORT_REASON_LABELS[value]}
              </label>
            ))}
          </fieldset>
          {reason === 'other' && (
            <div className="space-y-1.5">
              <Label htmlFor="details">Detalles</Label>
              <Textarea id="details" maxLength={500} value={details} onChange={(e) => setDetails(e.target.value)} />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!reason || sending}>
              Enviar reporte
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
