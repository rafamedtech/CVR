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
    }
  })

  if (!item) {
    throw createError({ statusCode: 404, statusMessage: 'No se encontró el concepto.' })
  }

  await prisma.orderItem.delete({ where: { id: item.id } })
  await recalculateOrder(item.orderId)

  return { success: true }
})
