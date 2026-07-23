export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireWorkshopRole(context, ['MANAGER', 'CASHIER'])
  const prisma = usePrisma()

  const expenses = await prisma.expense.findMany({
    where: workshopWhere(context),
    include: {
      workshop: true,
      recordedBy: true
    },
    orderBy: { expenseDate: 'desc' }
  })

  return expenses.map(expense => ({
    id: expense.id,
    workshopId: expense.workshopId,
    workshopName: expense.workshop.name,
    category: expense.category,
    description: expense.description,
    vendor: expense.vendor,
    amount: Number(expense.amount),
    expenseDate: expense.expenseDate.toISOString(),
    notes: expense.notes,
    recordedByName: expense.recordedBy.fullName
  }))
})
