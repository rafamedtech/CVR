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
    where: { id, ...expenseAccessWhere(context) },
    select: { id: true, workshopId: true }
  })

  if (!expense) {
    throw createError({ statusCode: 404, statusMessage: 'No se encontró el gasto.' })
  }

  if (expense.workshopId === null) requireSuperAdmin(context)

  const orderId = workshopId && body.assignmentType === 'ORDER'
    ? await resolveExpenseOrderId(body.orderId, workshopId)
    : null
  const exchangeRate = normalizeExchangeRate(body.currency, body.exchangeRate)
  const amountMxn = convertToMxn(body.amount, body.currency, exchangeRate)

  return prisma.expense.update({
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
      orderId
    }
  })
})
