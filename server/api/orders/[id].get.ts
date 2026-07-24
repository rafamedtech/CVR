export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Orden inválida.' })
  }

  const prisma = usePrisma()
  const order = await prisma.serviceOrder.findFirst({
    where: {
      id,
      ...workshopWhere(context),
      ...assignedOrderWhere(context)
    },
    include: {
      workshop: true,
      customer: true,
      vehicle: true,
      assignedTo: true,
      payments: {
        include: { recordedBy: true },
        orderBy: { paidAt: 'desc' }
      },
      items: {
        orderBy: { createdAt: 'asc' }
      }
    }
  })

  if (!order) {
    throw createError({ statusCode: 404, statusMessage: 'No se encontró la orden.' })
  }

  const base = serializeOrderListItem(order)
  const role = currentWorkshopRole(context)
  const canViewCosts = context.isSuperAdmin || role === 'MANAGER' || role === 'CASHIER'

  return {
    ...base,
    customerId: order.customerId,
    vehicleId: order.vehicleId,
    complaint: order.complaint,
    diagnosis: order.diagnosis,
    intakeNotes: order.intakeNotes,
    internalNotes: order.internalNotes,
    mileageIn: order.mileageIn,
    fuelLevelIn: order.fuelLevelIn,
    approvedAt: order.approvedAt?.toISOString() ?? null,
    startedAt: order.startedAt?.toISOString() ?? null,
    completedAt: order.completedAt?.toISOString() ?? null,
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
    subtotal: Number(order.subtotal),
    discountTotal: Number(order.discountTotal),
    taxTotal: Number(order.taxTotal),
    workshopTaxRate: Number(order.workshop.taxRate),
    items: order.items.map(item => ({
      id: item.id,
      type: item.type,
      description: item.description,
      quantity: Number(item.quantity),
      unitCost: canViewCosts ? Number(item.unitCost) : 0,
      unitPrice: Number(item.unitPrice),
      discount: Number(item.discount),
      taxRate: Number(item.taxRate),
      subtotal: Number(item.subtotal),
      taxTotal: Number(item.taxTotal),
      total: Number(item.total),
      totalCost: canViewCosts ? Number(item.totalCost) : 0
    })),
    payments: order.payments.map(payment => ({
      id: payment.id,
      amount: Number(payment.amount),
      method: payment.method,
      reference: payment.reference,
      notes: payment.notes,
      paidAt: payment.paidAt.toISOString(),
      recordedByName: payment.recordedBy.fullName
    }))
  }
})
