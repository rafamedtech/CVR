export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  const query = getQuery(event)
  const search = typeof query.search === 'string' ? query.search.trim() : ''
  const prisma = usePrisma()

  const customers = await prisma.customer.findMany({
    where: {
      ...workshopWhere(context),
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
      workshop: true,
      _count: {
        select: {
          vehicles: true,
          orders: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return customers.map(customer => ({
    id: customer.id,
    workshopId: customer.workshopId,
    workshopName: customer.workshop.name,
    fullName: customer.fullName,
    phone: customer.phone,
    alternatePhone: customer.alternatePhone,
    email: customer.email,
    taxId: customer.taxId,
    address: customer.address,
    notes: customer.notes,
    vehiclesCount: customer._count.vehicles,
    ordersCount: customer._count.orders,
    createdAt: customer.createdAt.toISOString()
  }))
})
