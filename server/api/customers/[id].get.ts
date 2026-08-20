export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Cliente inválido.' })
  }

  const prisma = usePrisma()
  const customer = await prisma.customer.findFirst({
    where: {
      id,
      ...customerAccessWhere(context)
    },
    include: {
      workshops: {
        where: context.isSuperAdmin ? {} : { workshopId: context.workshopId! },
        include: { workshop: true },
        orderBy: { createdAt: 'asc' }
      },
      vehicles: {
        where: vehicleAccessWhere(context),
        include: {
          workshops: {
            where: context.isSuperAdmin ? {} : { workshopId: context.workshopId! },
            include: { workshop: true },
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
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
          vehicles: { where: vehicleAccessWhere(context) },
          orders: { where: workshopWhere(context) }
        }
      }
    }
  })

  if (!customer) {
    throw createError({ statusCode: 404, statusMessage: 'No se encontró el cliente.' })
  }

  const workshops = customer.workshops.map(({ workshop }) => ({
    id: workshop.id,
    name: workshop.name,
    type: workshop.type
  }))

  return {
    id: customer.id,
    workshops,
    workshopTypes: workshops.map(workshop => workshop.type),
    fullName: customer.fullName,
    type: customer.type,
    phone: customer.phone,
    alternatePhone: customer.alternatePhone,
    email: customer.email,
    taxId: customer.taxId,
    address: serializeCustomerAddress(customer),
    notes: customer.notes,
    vehiclesCount: customer._count.vehicles,
    ordersCount: customer._count.orders,
    createdAt: customer.createdAt.toISOString(),
    vehicles: customer.vehicles.map(vehicle => ({
      id: vehicle.id,
      workshops: vehicle.workshops.map(({ workshop }) => ({
        id: workshop.id,
        name: workshop.name,
        type: workshop.type
      })),
      customerId: customer.id,
      customerName: customer.fullName,
      licensePlate: vehicle.licensePlate,
      vin: vehicle.vin,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      mileage: vehicle.mileage,
      fuelLevel: vehicle.fuelLevel,
      notes: vehicle.notes
    })),
    orders: customer.orders.map(serializeOrderListItem)
  }
})
