import { expenseMutationSchema } from '#shared/expense'
import { convertToMxn, normalizeExchangeRate } from '#shared/currency'

export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireWorkshopRole(context, ['MANAGER', 'CASHIER'])
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Gasto inválido.' })
  }

  const body = await readCrmBody(event, expenseMutationSchema)
  const workshopId = resolveExpenseWorkshopId(context, body.assignmentType)
  const prisma = usePrisma()
  const expense = await prisma.expense.findFirst({
    where: { id, ...expenseAccessWhere(context) }
  })

  if (!expense) {
    throw createError({ statusCode: 404, statusMessage: 'No se encontró el gasto.' })
  }

  if (expense.workshopId === null) requireSuperAdmin(context)

  const orderId = workshopId && body.assignmentType === 'ORDER'
    ? await resolveExpenseOrderId(body.orderId, workshopId)
    : null
  const freightId = workshopId && body.assignmentType === 'FREIGHT'
    ? await resolveExpenseFreightId(body.freightId, workshopId)
    : null
  const exchangeRate = normalizeExchangeRate(body.currency, body.exchangeRate)
  const amountMxn = convertToMxn(body.amount, body.currency, exchangeRate)

  return prisma.$transaction(async (transaction) => {
    const previous = await lockForAudit(transaction, 'expense', expense.id, () => transaction.expense.findUnique({ where: { id: expense.id } }))
    const updated = await transaction.expense.update({
      where: { id: expense.id },
      data: {
        workshopId,
        category: body.category,
        method: body.method,
        description: body.description,
        vendor: body.vendor || null,
        amount: body.amount,
        amountMxn,
        currency: body.currency,
        exchangeRate,
        expenseDate: new Date(body.expenseDate),
        notes: body.notes || null,
        orderId,
        freightId
      }
    })
    await recordAudit(transaction, context, {
      entityType: 'expense',
      entityId: expense.id,
      action: 'update',
      workshopId: updated.workshopId,
      snapshot: previous,
      changes: updated,
      effectiveDate: updated.expenseDate,
      source: expenseAuditSource(updated)
    })
    return updated
  })
})
