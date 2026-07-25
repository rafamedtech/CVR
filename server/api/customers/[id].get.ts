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
      ...workshopWhere(context)
    },
    include: {
      workshop: true,
      vehicles: {
        orderBy: { createdAt: 'desc' }
      },
      orders: {
        where: assignedOrderWhere(context),
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
          vehicles: true,
          orders: true
        }
      }
    }
  })

  if (!customer) {
    throw createError({ statusCode: 404, statusMessage: 'No se encontró el cliente.' })
  }

  const workshopTypes = context.workshopId
    ? [customer.workshop.type]
    : [...new Set((await prisma.customer.findMany({
        where: {
          OR: [
            { phone: customer.phone },
            ...(customer.email ? [{ email: customer.email }] : []),
            ...(customer.taxId ? [{ taxId: customer.taxId }] : [])
          ]
        },
        select: {
          workshop: {
            select: { type: true }
          }
        }
      })).map(item => item.workshop.type))]

  return {
    id: customer.id,
    workshopId: customer.workshopId,
    workshopName: customer.workshop.name,
    workshopTypes,
    fullName: customer.fullName,
    phone: customer.phone,
    alternatePhone: customer.alternatePhone,
    email: customer.email,
    taxId: customer.taxId,
    address: customer.address,
    notes: customer.notes,
    vehiclesCount: customer._count.vehicles,
    ordersCount: customer._count.orders,
    createdAt: customer.createdAt.toISOString(),
    vehicles: customer.vehicles.map(vehicle => ({
      id: vehicle.id,
      workshopId: vehicle.workshopId,
      workshopName: customer.workshop.name,
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
