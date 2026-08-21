export async function resolveExpenseOrderId(orderId: string, workshopId: string) {
  if (!orderId) return null

  const order = await usePrisma().serviceOrder.findFirst({
    where: { id: orderId, workshopId },
    select: { id: true }
  })

  if (!order) {
    throw createError({
      statusCode: 404,
      statusMessage: 'La orden seleccionada no pertenece al taller activo.'
    })
  }

  return order.id
}
