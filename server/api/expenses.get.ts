export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireWorkshopRole(context, ['MANAGER', 'CASHIER'])
  const prisma = usePrisma()

  const expenses = await prisma.expense.findMany({
    where: workshopWhere(context),
    include: {
      workshop: true,
      recordedBy: true,
      order: {
        include: {
          customer: true,
          vehicle: true
        }
      }
    },
    orderBy: { expenseDate: 'desc' }
  })

  return expenses.map(expense => ({
    id: expense.id,
    workshopId: expense.workshopId,
    workshopName: expense.workshop.name,
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
