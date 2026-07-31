export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireSuperAdmin(context)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Orden inválida.' })
  }

  const prisma = usePrisma()
  const order = await prisma.serviceOrder.findFirst({
    where: {
      id,
      ...workshopWhere(context)
    },
    select: { id: true }
  })

  if (!order) {
    throw createError({ statusCode: 404, statusMessage: 'No se encontró la orden.' })
  }

  await prisma.serviceOrder.delete({ where: { id: order.id } })

  return { success: true }
})
