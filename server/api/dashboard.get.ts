const openStatuses = ['ESTIMATE', 'AWAITING_APPROVAL', 'APPROVED', 'IN_PROGRESS', 'QUALITY_CONTROL', 'READY'] as const
const salesStatuses = ['APPROVED', 'IN_PROGRESS', 'QUALITY_CONTROL', 'READY', 'DELIVERED'] as const

export default defineEventHandler(async (event) => {
  const context = await requireCrmUser(event)
  const query = getQuery(event)
  const now = new Date()
  const from = typeof query.from === 'string'
    ? new Date(`${query.from}T00:00:00`)
    : new Date(now.getFullYear(), now.getMonth(), 1)
  const to = typeof query.to === 'string'
    ? new Date(`${query.to}T23:59:59.999`)
    : now
  const monthEnd = typeof query.monthEnd === 'string'
    ? new Date(`${query.monthEnd}T23:59:59.999`)
    : to

  if (
    Number.isNaN(from.getTime())
    || Number.isNaN(to.getTime())
    || Number.isNaN(monthEnd.getTime())
    || from > to
    || from > monthEnd
  ) {
    throw createError({ statusCode: 400, statusMessage: 'El rango de fechas no es válido.' })
  }

  const prisma = usePrisma()
  const role = currentWorkshopRole(context)
  const canViewFinancials = context.isSuperAdmin || role === 'MANAGER' || role === 'CASHIER'
  const where = {
    ...workshopWhere(context),
    ...assignedOrderWhere(context)
  }
  const [periodOrders, upcomingDeliveries, openOrders, allReceivableOrders, expenses, workshops] = await Promise.all([
    prisma.serviceOrder.findMany({
      where: {
        ...where,
        status: { in: [...salesStatuses] },
        createdAt: { gte: from, lte: to }
      },
      include: {
        workshop: true,
        customer: true,
        vehicle: true,
        assignedTo: true,
        payments: true,
        items: true
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.serviceOrder.findMany({
      where: {
        ...where,
        status: { in: [...openStatuses] },
        promisedAt: { gte: from, lte: monthEnd }
      },
      include: {
        workshop: true,
        customer: true,
        vehicle: true,
        assignedTo: true,
        payments: true
      },
      orderBy: [
        { promisedAt: 'asc' },
        { createdAt: 'desc' }
      ]
    }),
    prisma.serviceOrder.count({
      where: {
        ...where,
        status: { in: [...openStatuses] }
      }
    }),
    canViewFinancials
      ? prisma.serviceOrder.findMany({
          where: {
            ...where,
            status: { in: [...salesStatuses] }
          },
          include: { payments: true }
        })
      : Promise.resolve([]),
    canViewFinancials
      ? prisma.expense.findMany({
          where: {
            ...workshopWhere(context),
            expenseDate: { gte: from, lte: to }
          }
        })
      : Promise.resolve([]),
    prisma.workshop.findMany({
      where: {
        active: true,
        ...(context.workshopId ? { id: context.workshopId } : {})
      },
      orderBy: { name: 'asc' }
    })
  ])

  const sales = periodOrders.reduce((sum, order) => sum + Number(order.total), 0)
  const collected = periodOrders.reduce((sum, order) => (
    sum + order.payments
      .filter(payment => payment.paidAt >= from && payment.paidAt <= to)
      .reduce((paymentSum, payment) => paymentSum + Number(payment.amount), 0)
  ), 0)
  const costs = periodOrders.reduce((sum, order) => (
    sum + order.items.reduce((itemSum, item) => itemSum + Number(item.totalCost), 0)
  ), 0)
  const expenseTotal = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
  const grossProfit = sales - costs
  const receivable = allReceivableOrders.reduce((sum, order) => {
    const paid = order.payments.reduce((paymentSum, payment) => paymentSum + Number(payment.amount), 0)
    return sum + Math.max(0, Number(order.total) - paid)
  }, 0)
  const delivered = periodOrders.filter(order => order.status === 'DELIVERED')
  const completedDurations = delivered
    .filter(order => order.deliveredAt)
    .map(order => (order.deliveredAt!.getTime() - order.createdAt.getTime()) / 86_400_000)
  const statusMap = new Map<string, number>()
  const trendMap = new Map<string, {
    date: string
    sales: number
    collected: number
    expenses: number
    orders: number
    delivered: number
  }>()

  const trendKey = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }
  const trendEntry = (date: Date) => {
    const key = trendKey(date)
    const current = trendMap.get(key)

    if (current) return current

    const entry = {
      date: `${key}T12:00:00.000Z`,
      sales: 0,
      collected: 0,
      expenses: 0,
      orders: 0,
      delivered: 0
    }
    trendMap.set(key, entry)

    return entry
  }

  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const lastDay = new Date(to.getFullYear(), to.getMonth(), to.getDate())
  while (cursor <= lastDay) {
    trendEntry(cursor)
    cursor.setDate(cursor.getDate() + 1)
  }

  for (const order of periodOrders) {
    statusMap.set(order.status, (statusMap.get(order.status) ?? 0) + 1)
    const orderEntry = trendEntry(order.createdAt)
    orderEntry.sales += canViewFinancials ? Number(order.total) : 0
    orderEntry.orders += 1
    orderEntry.delivered += order.status === 'DELIVERED' ? 1 : 0

    if (canViewFinancials) {
      for (const payment of order.payments) {
        if (payment.paidAt >= from && payment.paidAt <= to) {
          trendEntry(payment.paidAt).collected += Number(payment.amount)
        }
      }
    }
  }

  if (canViewFinancials) {
    for (const expense of expenses) {
      trendEntry(expense.expenseDate).expenses += Number(expense.amount)
    }
  }

  return {
    canViewFinancials,
    period: {
      from: from.toISOString(),
      to: to.toISOString()
    },
    trend: [...trendMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
    kpis: {
      sales: canViewFinancials ? sales : 0,
      collected: canViewFinancials ? collected : 0,
      costs: canViewFinancials ? costs : 0,
      grossProfit: canViewFinancials ? grossProfit : 0,
      expenses: canViewFinancials ? expenseTotal : 0,
      netProfit: canViewFinancials ? grossProfit - expenseTotal : 0,
      receivable: canViewFinancials ? receivable : 0,
      openOrders,
      completedOrders: delivered.length,
      averageTicket: canViewFinancials && periodOrders.length ? sales / periodOrders.length : 0,
      averageDays: completedDurations.length
        ? completedDurations.reduce((sum, days) => sum + days, 0) / completedDurations.length
        : 0
    },
    statusCounts: [...statusMap.entries()].map(([status, count]) => ({ status, count })),
    workshops: workshops.map((workshop) => {
      const orders = periodOrders.filter(order => order.workshopId === workshop.id)
      const workshopExpenses = expenses
        .filter(expense => expense.workshopId === workshop.id)
        .reduce((sum, expense) => sum + Number(expense.amount), 0)

      return {
        id: workshop.id,
        name: workshop.name,
        sales: canViewFinancials ? orders.reduce((sum, order) => sum + Number(order.total), 0) : 0,
        collected: canViewFinancials
          ? orders.reduce((sum, order) => (
              sum + order.payments.reduce((paymentSum, payment) => paymentSum + Number(payment.amount), 0)
            ), 0)
          : 0,
        expenses: canViewFinancials ? workshopExpenses : 0,
        openOrders: orders.filter(order => openStatuses.includes(order.status as typeof openStatuses[number])).length
      }
    }),
    recentOrders: periodOrders.slice(0, 6).map(serializeOrderListItem),
    upcomingDeliveries: upcomingDeliveries.map(serializeOrderListItem)
  }
})
