export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireWorkshopRole(context, ['MANAGER', 'CASHIER', 'READ_ONLY'])
  const prisma = usePrisma()

  const expenses = await prisma.expense.findMany({
    where: workshopWhere(context),
    select: {
      id: true, workshopId: true, category: true, method: true, description: true,
      vendor: true, amount: true, amountMxn: true, currency: true, exchangeRate: true,
      expenseDate: true, notes: true,
      workshop: { select: { name: true, type: true } },
      recordedBy: { select: { fullName: true } },
      order: {
        select: {
          id: true, orderNumber: true,
          customer: { select: { fullName: true } },
          vehicle: { select: { make: true, model: true, year: true } }
        }
      }
    },
    orderBy: { expenseDate: 'desc' }
  })

  return expenses.map(expense => ({
    id: expense.id,
    workshopId: expense.workshopId,
    workshopName: expense.workshop.name,
    workshopType: expense.workshop.type,
    category: expense.category,
    method: expense.method,
    description: expense.description,
    vendor: expense.vendor,
    amount: Number(expense.amount),
    amountMxn: Number(expense.amountMxn),
    currency: expense.currency,
    exchangeRate: Number(expense.exchangeRate),
    expenseDate: expense.expenseDate.toISOString(),
    notes: expense.notes,
    recordedByName: expense.recordedBy.fullName,
    order: expense.order
      ? {
          id: expense.order.id,
          orderNumber: expense.order.orderNumber,
          customerName: expense.order.customer.fullName,
          vehicleLabel: `${expense.order.vehicle.make} ${expense.order.vehicle.model} ${expense.order.vehicle.year}`
        }
      : null
  }))
})
