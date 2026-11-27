import { expenseMutationSchema } from '#shared/expense'
import { convertToMxn, normalizeExchangeRate } from '#shared/currency'

export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  const body = await readCrmBody(event, expenseMutationSchema)
  const workshopId = resolveExpenseWorkshopId(context, body.assignmentType)
  const prisma = usePrisma()
  const orderId = workshopId && body.assignmentType === 'ORDER'
    ? await resolveExpenseOrderId(body.orderId, workshopId)
    : null
  const exchangeRate = normalizeExchangeRate(body.currency, body.exchangeRate)
  const amountMxn = convertToMxn(body.amount, body.currency, exchangeRate)

  return prisma.$transaction(async (transaction) => {
    const expense = await transaction.expense.create({
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
        expenseDate: body.expenseDate ? new Date(body.expenseDate) : new Date(),
        notes: body.notes || null,
        orderId,
        recordedById: context.profile.id
      }
    })
    await recordAudit(transaction, context, {
      entityType: 'expense',
      entityId: expense.id,
      action: 'create',
      workshopId: expense.workshopId,
      snapshot: expense,
      effectiveDate: expense.expenseDate,
      source: expense.orderId ? { type: 'service_order', id: expense.orderId } : null
    })
    return expense
  })
})
