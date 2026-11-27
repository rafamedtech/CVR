import { optionalReasonSchema } from '#shared/audit'

export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireSuperAdmin(context)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Orden inválida.' })
  }

  const parsedReason = optionalReasonSchema.safeParse(await readBody(event).catch(() => null))
  if (!parsedReason.success) {
    throw createError({ statusCode: 400, statusMessage: 'El motivo no es válido (máximo 500 caracteres).' })
  }
  const { reason } = parsedReason.data
  const prisma = usePrisma()
  const order = await prisma.serviceOrder.findFirst({
    where: {
      id,
      ...workshopWhere(context)
    },
    select: { id: true, workshopId: true }
  })

  if (!order) {
    throw createError({ statusCode: 404, statusMessage: 'No se encontró la orden.' })
  }

  await prisma.$transaction(async (transaction) => {
    // La foto incluye conceptos y pagos (se borran en cascada) y los gastos que quedarán sin orden.
    const previous = await lockForAudit(transaction, 'service_order', order.id, () => transaction.serviceOrder.findUnique({
      where: { id: order.id },
      include: { items: true, payments: true, expenses: { select: { id: true } } }
    }))
    await recordAudit(transaction, context, {
      entityType: 'service_order',
      entityId: order.id,
      action: 'delete',
      workshopId: order.workshopId,
      snapshot: previous,
      reason
    })
    await transaction.serviceOrder.delete({ where: { id: order.id } })
  })

  return { success: true }
})
