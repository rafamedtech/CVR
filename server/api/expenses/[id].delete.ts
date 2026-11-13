export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireWorkshopRole(context, ['MANAGER', 'CASHIER'])
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Gasto inválido.' })
  }

  const result = await usePrisma().expense.deleteMany({
    where: {
      id,
      ...expenseAccessWhere(context),
      ...(!context.isSuperAdmin ? { workshopId: requireSelectedWorkshop(context) } : {})
    }
  })

  if (!result.count) {
    throw createError({ statusCode: 404, statusMessage: 'No se encontró el gasto.' })
  }

  return { success: true }
})
