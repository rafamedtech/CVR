import { deletionReasonSchema } from '#shared/audit'

/** Eliminación con motivo obligatorio (super admin). Sus gastos quedan sin flete. */
export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireSuperAdmin(context)
  const workshopId = requireTransportWorkshop(context)
  const id = requireFreightId(getRouterParam(event, 'id'))
  const { reason } = await readCrmBody(event, deletionReasonSchema)
  const prisma = usePrisma()

  const freight = await prisma.freight.findFirst({ where: { id, workshopId }, select: { id: true } })
  if (!freight) throw createError({ statusCode: 404, statusMessage: 'No se encontró el flete.' })

  await prisma.$transaction(async (transaction) => {
    const previous = await lockForAudit(transaction, 'freight', freight.id, () => transaction.freight.findUnique({
      where: { id: freight.id },
      include: { expenses: { select: { id: true } } }
    }))
    await recordAudit(transaction, context, {
      entityType: 'freight',
      entityId: freight.id,
      action: 'delete',
      workshopId,
      snapshot: previous,
      reason
    })
    await transaction.freight.delete({ where: { id: freight.id } })
  })

  return { success: true }
})
