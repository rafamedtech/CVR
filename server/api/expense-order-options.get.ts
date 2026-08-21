export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  requireWorkshopRole(context, ['MANAGER', 'CASHIER'])
  const workshopId = requireSelectedWorkshop(context)
  const prisma = usePrisma()

  const orders = await prisma.serviceOrder.findMany({
    where: { workshopId },
    select: {
      id: true,
      orderNumber: true,
      customer: { select: { fullName: true } },
      vehicle: { select: { make: true, model: true, year: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  return orders.map(order => ({
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customer.fullName,
    vehicleLabel: `${order.vehicle.make} ${order.vehicle.model} ${order.vehicle.year}`
  }))
})
