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

  return prisma.expense.create({
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
})
