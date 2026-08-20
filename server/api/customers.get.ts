export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  const query = getQuery(event)
  const search = typeof query.search === 'string' ? query.search.trim() : ''
  const prisma = usePrisma()

  const customers = await prisma.customer.findMany({
    where: {
      ...customerAccessWhere(context),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
              { email: { contains: search, mode: 'insensitive' } }
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
      _count: {
        select: {
          vehicles: { where: vehicleAccessWhere(context) },
          orders: { where: workshopWhere(context) }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return customers.map(customer => ({
    id: customer.id,
    workshops: customer.workshops.map(({ workshop }) => ({
      id: workshop.id,
      name: workshop.name,
      type: workshop.type
    })),
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
    createdAt: customer.createdAt.toISOString()
  }))
})
