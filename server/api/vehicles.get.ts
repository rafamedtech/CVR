export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  const query = getQuery(event)
  const customerId = typeof query.customerId === 'string' ? query.customerId : undefined
  const search = typeof query.search === 'string' ? query.search.trim() : ''
  const prisma = usePrisma()

  const vehicles = await prisma.vehicle.findMany({
    where: {
      ...vehicleAccessWhere(context),
      ...(customerId ? { customerId } : {}),
      ...(search
        ? {
            OR: [
              { licensePlate: { contains: search, mode: 'insensitive' } },
              { vin: { contains: search, mode: 'insensitive' } },
              { make: { contains: search, mode: 'insensitive' } },
              { model: { contains: search, mode: 'insensitive' } },
              { customer: { fullName: { contains: search, mode: 'insensitive' } } }
            ]
          }
        : {})
    },
    include: {
      workshops: {
        where: context.isSuperAdmin ? {} : { workshopId: context.workshopId! },
        include: { workshop: true },
        orderBy: { createdAt: 'asc' }
      },
      customer: true
    },
    orderBy: { createdAt: 'desc' }
  })

  return vehicles.map(vehicle => ({
    id: vehicle.id,
    workshops: vehicle.workshops.map(({ workshop }) => ({
      id: workshop.id,
      name: workshop.name,
      type: workshop.type
    })),
    customerId: vehicle.customerId,
    customerName: vehicle.customer.fullName,
    licensePlate: vehicle.licensePlate,
    vin: vehicle.vin,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    color: vehicle.color,
    mileage: vehicle.mileage,
    fuelLevel: vehicle.fuelLevel,
    notes: vehicle.notes
  }))
})
