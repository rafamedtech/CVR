import { z } from 'zod'

export const DELETION_REASON_MIN = 3
export const DELETION_REASON_MAX = 500

/** Motivo obligatorio para eliminar pagos y gastos (CVR-02). */
export const deletionReasonSchema = z.object({
  reason: z.string({ error: 'Escribe el motivo de la eliminación.' })
    .trim()
    .min(DELETION_REASON_MIN, `El motivo debe tener al menos ${DELETION_REASON_MIN} caracteres.`)
    .max(DELETION_REASON_MAX, `El motivo admite máximo ${DELETION_REASON_MAX} caracteres.`)
})

/** Motivo opcional para eliminaciones de super admin que no mueven saldo directo. */
export const optionalReasonSchema = z.object({
  reason: z.string().trim().max(DELETION_REASON_MAX).optional().nullable()
}).nullish().transform(value => ({ reason: value?.reason || null }))

export type AuditAction = 'create' | 'update' | 'delete'

export interface AuditEventView {
  id: string
  entityType: string
  entityId: string
  action: AuditAction
  actorEmail: string
  actorRole: string
  switchedFromId: string | null
  reason: string | null
  effectiveDate: string | null
  createdAt: string
}
