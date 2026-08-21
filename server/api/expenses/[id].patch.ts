import { expenseMutationSchema } from '#shared/expense'

export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireWorkshopRole(context, ['MANAGER', 'CASHIER'])
  const workshopId = requireSelectedWorkshop(context)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Gasto inválido.' })
  }

  const body = await readCrmBody(event, expenseMutationSchema)
  const prisma = usePrisma()
  const expense = await prisma.expense.findFirst({
    where: { id, workshopId },
    select: { id: true }
  })

  if (!expense) {
    throw createError({ statusCode: 404, statusMessage: 'No se encontró el gasto.' })
  }

  const orderId = await resolveExpenseOrderId(
    body.assignmentType === 'ORDER' ? body.orderId : '',
    workshopId
  )
  return prisma.expense.update({
    where: { id: expense.id },
    data: {
      category: body.category,
      method: body.method,
      description: body.description,
      vendor: body.vendor || null,
      amount: body.amount,
      expenseDate: new Date(body.expenseDate),
      notes: body.notes || null,
      orderId
    }
  })
})
