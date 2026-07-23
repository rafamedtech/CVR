const validStatuses = new Set([
  'ESTIMATE',
  'AWAITING_APPROVAL',
  'APPROVED',
  'IN_PROGRESS',
  'QUALITY_CONTROL',
  'READY',
  'DELIVERED',
  'CANCELLED'
])

export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  const query = getQuery(event)
  const search = typeof query.search === 'string' ? query.search.trim() : ''
  const status = typeof query.status === 'string' && validStatuses.has(query.status)
    ? query.status as 'ESTIMATE' | 'AWAITING_APPROVAL' | 'APPROVED' | 'IN_PROGRESS' | 'QUALITY_CONTROL' | 'READY' | 'DELIVERED' | 'CANCELLED'
    : undefined
  const prisma = usePrisma()

  const orders = await prisma.serviceOrder.findMany({
    where: {
      ...workshopWhere(context),
      ...assignedOrderWhere(context),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search, mode: 'insensitive' } },
              { customer: { fullName: { contains: search, mode: 'insensitive' } } },
              { vehicle: { licensePlate: { contains: search, mode: 'insensitive' } } },
              { vehicle: { vin: { contains: search, mode: 'insensitive' } } }
            ]
          }
        : {})
    },
    include: {
      workshop: true,
      customer: true,
      vehicle: true,
      assignedTo: true,
      payments: true
    },
    orderBy: { createdAt: 'desc' }
  })

  return orders.map(serializeOrderListItem)
})
