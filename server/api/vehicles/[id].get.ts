export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Vehículo inválido.' })
  }

  const prisma = usePrisma()
  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id,
      ...vehicleAccessWhere(context)
    },
    include: {
      customer: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true
        }
      },
      workshops: {
        where: context.isSuperAdmin ? {} : { workshopId: context.workshopId! },
        include: { workshop: true },
        orderBy: { createdAt: 'asc' }
      },
      orders: {
        where: {
          ...workshopWhere(context),
          ...assignedOrderWhere(context)
        },
        include: {
          workshop: true,
          customer: true,
          vehicle: true,
          assignedTo: true,
          payments: true
        },
        orderBy: { createdAt: 'desc' }
      },
      _count: {
        select: {
          orders: {
            where: {
              ...workshopWhere(context),
              ...assignedOrderWhere(context)
            }
          }
        }
      }
    }
  })

  if (!vehicle) {
    throw createError({ statusCode: 404, statusMessage: 'No se encontró el vehículo.' })
  }

  return {
    id: vehicle.id,
    workshops: vehicle.workshops.map(({ workshop }) => ({
      id: workshop.id,
      name: workshop.name,
      type: workshop.type
    })),
    customerId: vehicle.customerId,
    customerName: vehicle.customer.fullName,
    customer: vehicle.customer,
    licensePlate: vehicle.licensePlate,
    vin: vehicle.vin,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    color: vehicle.color,
    mileage: vehicle.mileage,
    fuelLevel: vehicle.fuelLevel,
    notes: vehicle.notes,
    ordersCount: vehicle._count.orders,
    createdAt: vehicle.createdAt.toISOString(),
    orders: vehicle.orders.map(serializeOrderListItem)
  }
})
