import { deletionReasonSchema } from '#shared/audit'

export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireWorkshopRole(context, ['MANAGER', 'CASHIER'])
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Gasto inválido.' })
  }

  const { reason } = await readCrmBody(event, deletionReasonSchema)
  const prisma = usePrisma()
  const expense = await prisma.expense.findFirst({
    where: {
      id,
      ...expenseAccessWhere(context),
      ...(!context.isSuperAdmin ? { workshopId: requireSelectedWorkshop(context) } : {})
    }
  })

  if (!expense) {
    throw createError({ statusCode: 404, statusMessage: 'No se encontró el gasto.' })
  }

  await prisma.$transaction(async (transaction) => {
    const previous = await lockForAudit(transaction, 'expense', expense.id, () => transaction.expense.findUnique({ where: { id: expense.id } }))
    await recordAudit(transaction, context, {
      entityType: 'expense',
      entityId: previous.id,
      action: 'delete',
      workshopId: previous.workshopId,
      snapshot: previous,
      reason,
      effectiveDate: previous.expenseDate,
      source: previous.orderId ? { type: 'service_order', id: previous.orderId } : null
    })
    // deleteMany conserva el filtro de acceso aunque el gasto cambie entre lectura y borrado.
    const result = await transaction.expense.deleteMany({
      where: {
        id: expense.id,
        ...expenseAccessWhere(context),
        ...(!context.isSuperAdmin ? { workshopId: requireSelectedWorkshop(context) } : {})
      }
    })
    if (!result.count) {
      throw createError({ statusCode: 404, statusMessage: 'No se encontró el gasto.' })
    }
  })

  return { success: true }
})
