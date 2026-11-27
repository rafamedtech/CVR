import { z } from 'zod'
import type { AuditAction, AuditEventView } from '#shared/audit'

const querySchema = z.object({ orderId: z.uuid('Orden inválida.') })

/** Historial de cambios de una orden: la orden, sus partidas, pagos y gastos. */
export default defineEventHandler(async (event): Promise<AuditEventView[]> => {
  const context = await requireCrmUser(event)
  requireGlobalReadAccess(context)
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Orden inválida.' })
  }

  const { orderId } = parsed.data
  const rows = await usePrisma().auditEvent.findMany({
    where: {
      OR: [
        { entityType: 'service_order', entityId: orderId },
        { sourceType: 'service_order', sourceId: orderId }
      ],
      ...(context.workshopId ? { workshopId: context.workshopId } : {})
    },
    orderBy: { createdAt: 'desc' },
    take: 200
  })

  return rows.map(row => ({
    id: row.id,
    entityType: row.entityType,
    entityId: row.entityId,
    action: row.action as AuditAction,
    actorEmail: row.actorEmail,
    actorRole: row.actorRole,
    switchedFromId: row.switchedFromId,
    reason: row.reason,
    effectiveDate: row.effectiveDate?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString()
  }))
})
