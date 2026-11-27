export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireSuperAdmin(context)
  const id = getRouterParam(event, 'id')
  const itemId = getRouterParam(event, 'itemId')
  const prisma = usePrisma()

  const item = await prisma.orderItem.findFirst({
    where: {
      id: itemId,
      orderId: id,
      order: workshopWhere(context)
    },
    include: { order: { select: { workshopId: true } } }
  })

  if (!item) {
    throw createError({ statusCode: 404, statusMessage: 'No se encontró el concepto.' })
  }

  await prisma.$transaction(async (transaction) => {
    const previous = await lockForAudit(transaction, 'order_item', item.id, () => transaction.orderItem.findUnique({ where: { id: item.id } }))
    await recordAudit(transaction, context, {
      entityType: 'order_item',
      entityId: item.id,
      action: 'delete',
      workshopId: item.order.workshopId,
      snapshot: previous,
      source: { type: 'service_order', id: item.orderId }
    })
    await transaction.orderItem.delete({ where: { id: item.id } })
  })
  await recalculateOrder(item.orderId)

  return { success: true }
})
