export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireWorkshopRole(context, ['MANAGER', 'CASHIER'])
  const prisma = usePrisma()

  const payments = await prisma.payment.findMany({
    where: {
      order: workshopWhere(context)
    },
    include: {
      recordedBy: true,
      order: {
        include: {
          workshop: true,
          customer: true,
          vehicle: true
        }
      }
    },
    orderBy: [
      { paidAt: 'desc' },
      { createdAt: 'desc' }
    ]
  })

  return payments.map(payment => ({
    id: payment.id,
    amount: Number(payment.amount),
    amountMxn: Number(payment.amountMxn),
    currency: payment.currency,
    exchangeRate: Number(payment.exchangeRate),
    method: payment.method,
    reference: payment.reference,
    notes: payment.notes,
    paidAt: payment.paidAt.toISOString(),
    recordedByName: payment.recordedBy.fullName,
    workshopId: payment.order.workshopId,
    workshopName: payment.order.workshop.name,
    order: {
      id: payment.order.id,
      orderNumber: payment.order.orderNumber,
      customerName: payment.order.customer.fullName,
      vehicleLabel: `${payment.order.vehicle.make} ${payment.order.vehicle.model} ${payment.order.vehicle.year}`,
      licensePlate: payment.order.vehicle.licensePlate,
      total: Number(payment.order.total)
    }
  }))
})
