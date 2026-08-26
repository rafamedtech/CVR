import { expenseMutationSchema } from '#shared/expense'
import { convertToMxn, normalizeExchangeRate } from '#shared/currency'

export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireWorkshopRole(context, ['MANAGER', 'CASHIER'])
  const workshopId = requireSelectedWorkshop(context)
  const body = await readCrmBody(event, expenseMutationSchema)
  const prisma = usePrisma()
  const orderId = await resolveExpenseOrderId(
    body.assignmentType === 'ORDER' ? body.orderId : '',
    workshopId
  )
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
