import { canTransitionFreight, freightStatusSchema } from '#shared/freight'

/** Cambio de estado: salida, confirmación de entrega o cancelación. */
export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireWorkshopRole(context, ['MANAGER'])
  const workshopId = requireTransportWorkshop(context)
  const id = requireFreightId(getRouterParam(event, 'id'))
  const body = await readCrmBody(event, freightStatusSchema)
  const prisma = usePrisma()

  const freight = await prisma.freight.findFirst({ where: { id, workshopId }, select: { id: true } })
  if (!freight) throw createError({ statusCode: 404, statusMessage: 'No se encontró el flete.' })

  const occurredAt = body.occurredAt ? new Date(body.occurredAt) : new Date()
  if (occurredAt.getTime() > Date.now() + 5 * 60_000) {
    throw createError({ statusCode: 400, statusMessage: 'La fecha del evento no puede estar en el futuro.' })
  }

  return prisma.$transaction(async (transaction) => {
    const previous = await lockForAudit(transaction, 'freight', freight.id, () => transaction.freight.findUnique({ where: { id: freight.id } }))
    if (!canTransitionFreight(previous.status, body.status)) {
      throw createError({ statusCode: 409, statusMessage: 'El flete ya no admite ese cambio de estado. Recarga la información.' })
    }
    if (body.status === 'DELIVERED' && previous.pickedUpAt && occurredAt < previous.pickedUpAt) {
      throw createError({ statusCode: 400, statusMessage: 'La entrega no puede ser anterior a la salida.' })
    }

    const updated = await transaction.freight.update({
      where: { id: freight.id },
      data: {
        status: body.status,
        ...(body.status === 'IN_TRANSIT' ? { pickedUpAt: occurredAt } : {}),
        ...(body.status === 'DELIVERED'
          ? {
              deliveredAt: occurredAt,
              deliveryConfirmedById: context.profile.id,
              ...(body.deliveryTicketRef ? { deliveryTicketRef: body.deliveryTicketRef } : {})
            }
          : {}),
        ...(body.status === 'CANCELLED' ? { cancelledAt: occurredAt } : {})
      }
    })
    await recordAudit(transaction, context, {
      entityType: 'freight',
      entityId: freight.id,
      action: 'status',
      workshopId,
      snapshot: previous,
      changes: { status: updated.status, occurredAt },
      reason: body.reason,
      effectiveDate: occurredAt
    })
    return { id: updated.id, status: updated.status }
  })
})
