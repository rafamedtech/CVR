import { z } from 'zod'
import type { AuditAction, AuditEventView } from '#shared/audit'

const querySchema = z.object({
  orderId: z.uuid('Orden inválida.').optional(),
  freightId: z.uuid('Flete inválido.').optional()
}).refine(query => Boolean(query.orderId) !== Boolean(query.freightId), 'Indica una orden o un flete.')

/**
 * Historial de cambios.
 * - Orden: la orden, sus partidas, pagos y gastos (super admin o consulta global).
 * - Flete (CVR-03): el flete y sus gastos, para quien puede consultar el flete.
 */
export default defineEventHandler(async (event): Promise<AuditEventView[]> => {
  const context = await requireCrmUser(event)
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Registro inválido.' })
  }

  const prisma = usePrisma()
  let entity: { type: 'service_order' | 'freight', id: string }
  let includeLinked = true
  if (parsed.data.freightId) {
    const freight = await prisma.freight.findFirst({
      where: { id: parsed.data.freightId, ...freightAccessWhere(context) },
      select: { id: true }
    })
    if (!freight) throw createError({ statusCode: 404, statusMessage: 'No se encontró el flete.' })
    entity = { type: 'freight', id: freight.id }
    // Los eventos de gastos ligados solo para roles que ven costos.
    includeLinked = canViewFreightCosts(context)
  } else {
    requireGlobalReadAccess(context)
    entity = { type: 'service_order', id: parsed.data.orderId as string }
  }

  const rows = await prisma.auditEvent.findMany({
    where: {
      OR: [
        { entityType: entity.type, entityId: entity.id },
        ...(includeLinked ? [{ sourceType: entity.type, sourceId: entity.id }] : [])
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
    statusTo: row.action === 'status' ? readStatus(row.changes) : null,
    createdAt: row.createdAt.toISOString()
  }))
})

function readStatus(changes: unknown) {
  const status = (changes as { status?: unknown } | null)?.status
  return typeof status === 'string' ? status : null
}
