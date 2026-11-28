export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  const id = requireFreightId(getRouterParam(event, 'id'))

  const freight = await usePrisma().freight.findFirst({
    where: { id, ...freightAccessWhere(context) },
    select: {
      ...freightListSelect,
      sourceUrl: true,
      pickedUpAt: true,
      cancelledAt: true,
      deliveryTicketRef: true,
      invoiceSeries: true,
      invoiceFolio: true,
      invoiceUuid: true,
      notes: true,
      updatedAt: true,
      createdBy: { select: { fullName: true } },
      deliveryConfirmedBy: { select: { fullName: true } },
      expenses: {
        select: {
          id: true, category: true, method: true, description: true, vendor: true,
          amount: true, amountMxn: true, currency: true, exchangeRate: true, expenseDate: true, notes: true,
          recordedBy: { select: { fullName: true } }
        },
        orderBy: { expenseDate: 'desc' }
      }
    }
  })

  if (!freight) {
    throw createError({ statusCode: 404, statusMessage: 'No se encontró el flete.' })
  }

  const role = currentWorkshopRole(context)
  const canViewCosts = canViewFreightCosts(context)
  return {
    ...serializeFreightListItem(freight, canViewCosts),
    sourceUrl: freight.sourceUrl,
    pickedUpAt: freight.pickedUpAt?.toISOString() ?? null,
    cancelledAt: freight.cancelledAt?.toISOString() ?? null,
    deliveryTicketRef: freight.deliveryTicketRef,
    invoiceSeries: freight.invoiceSeries,
    invoiceFolio: freight.invoiceFolio,
    invoiceUuid: freight.invoiceUuid,
    notes: freight.notes,
    updatedAt: freight.updatedAt.toISOString(),
    createdByName: freight.createdBy.fullName,
    deliveryConfirmedByName: freight.deliveryConfirmedBy?.fullName ?? null,
    canManage: !context.isReadOnly && (context.isSuperAdmin || role === 'MANAGER'),
    canEdit: context.isSuperAdmin,
    canRecordCosts: !context.isReadOnly && (context.isSuperAdmin || role === 'MANAGER' || role === 'CASHIER'),
    canViewCosts,
    // Asesor y técnico no ven costos (mismo criterio que /api/expenses).
    expenses: !canViewCosts
      ? []
      : freight.expenses.map(expense => ({
          id: expense.id,
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
          recordedByName: expense.recordedBy.fullName
        }))
  }
})
