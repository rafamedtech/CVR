import type { DashboardActivityItem, DashboardOverviewData } from '../../app/types/crm'
import type { CrmRequestContext } from './auth'
import { orderListSelect } from './orders'
import { reportDateKey, reportDayStart, reportNextDay } from '../../shared/report'

const openStatuses = ['ESTIMATE', 'AWAITING_APPROVAL', 'APPROVED', 'IN_PROGRESS', 'QUALITY_CONTROL', 'READY'] as const

export async function getDashboardOverview(context: CrmRequestContext, now = new Date()): Promise<DashboardOverviewData> {
  const prisma = usePrisma()
  const timeZone = context.selectedWorkshop?.timezone ?? 'America/Tijuana'
  const today = reportDateKey(now, timeZone)
  const startOfToday = reportDayStart(today, timeZone)
  // Thirty calendar days, including today, in the workshop's timezone.
  const sinceKey = new Date(Date.parse(`${today}T12:00:00Z`) - 29 * 86_400_000).toISOString().slice(0, 10)
  const since = reportDayStart(sinceKey, timeZone)
  const activitySinceKey = new Date(Date.parse(`${today}T12:00:00Z`) - 6 * 86_400_000).toISOString().slice(0, 10)
  const activitySince = reportDayStart(activitySinceKey, timeZone)
  const activityRange = { gte: activitySince, lte: now }
  let nextWeekKey = today
  for (let day = 0; day < 7; day++) nextWeekKey = reportNextDay(nextWeekKey)
  const recentRange = { gte: since, lte: now }
  const role = currentWorkshopRole(context)
  const canViewFinancials = context.isSuperAdmin || ['MANAGER', 'CASHIER', 'READ_ONLY'].includes(role ?? '')
  const scope = workshopWhere(context)
  const ordersWhere = { ...scope, ...assignedOrderWhere(context) }
  const openWhere = { ...ordersWhere, status: { in: [...openStatuses] } }

  const [recentOrders, upcomingDeliveries, statuses, overdue, completedOrders, payments, expenses, customers, vehicles, collected, receivables] = await Promise.all([
    prisma.serviceOrder.findMany({
      where: ordersWhere, select: { ...orderListSelect, updatedAt: true },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: 12
    }),
    prisma.serviceOrder.findMany({
      where: { ...openWhere, promisedAt: { gte: startOfToday, lt: reportDayStart(nextWeekKey, timeZone) } },
      select: orderListSelect, orderBy: [{ promisedAt: 'asc' }, { id: 'asc' }], take: 6
    }),
    prisma.serviceOrder.groupBy({ by: ['status'], where: openWhere, _count: { _all: true } }),
    prisma.serviceOrder.count({ where: { ...openWhere, promisedAt: { lt: startOfToday } } }),
    prisma.serviceOrder.count({ where: { ...ordersWhere, status: { in: ['DELIVERED', 'LIQUIDATED'] }, deliveredAt: recentRange } }),
    canViewFinancials
      ? prisma.payment.findMany({
          where: { order: ordersWhere, paidAt: activityRange },
          select: { id: true, amountMxn: true, paidAt: true, order: { select: { id: true, orderNumber: true, customer: { select: { fullName: true } }, vehicle: { select: { make: true, model: true, year: true } } } } },
          orderBy: [{ paidAt: 'desc' }, { id: 'desc' }], take: 12
        })
      : Promise.resolve([]),
    canViewFinancials
      ? prisma.expense.findMany({
          where: { ...scope, expenseDate: { gte: new Date(`${activitySinceKey}T00:00:00Z`), lte: new Date(`${today}T23:59:59.999Z`) } },
          select: {
            id: true, amountMxn: true, expenseDate: true, description: true, vendor: true,
            order: { select: { id: true, orderNumber: true, customer: { select: { fullName: true } }, vehicle: { select: { make: true, model: true, year: true } } } }
          },
          orderBy: [{ expenseDate: 'desc' }, { id: 'desc' }], take: 12
        })
      : Promise.resolve([]),
    prisma.customer.findMany({
      where: { ...customerAccessWhere(context), createdAt: activityRange },
      select: { id: true, fullName: true, createdAt: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 12
    }),
    prisma.vehicle.findMany({
      where: { ...vehicleAccessWhere(context), createdAt: activityRange },
      select: { id: true, make: true, model: true, year: true, createdAt: true, customer: { select: { fullName: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 12
    }),
    canViewFinancials
      ? prisma.payment.aggregate({ where: { order: ordersWhere, paidAt: recentRange }, _sum: { amountMxn: true } })
      : Promise.resolve(null),
    canViewFinancials
      ? prisma.serviceOrder.findMany({
          where: { ...ordersWhere, status: { in: ['APPROVED', 'IN_PROGRESS', 'QUALITY_CONTROL', 'READY', 'DELIVERED', 'LIQUIDATED'] } },
          select: { total: true, payments: { select: { amountMxn: true } } }
        })
      : Promise.resolve([])
  ])

  const activity: DashboardActivityItem[] = [
    ...recentOrders.filter(order => order.updatedAt >= activitySince && order.updatedAt <= now).map(order => ({
      id: `order-${order.id}`, type: 'order' as const, title: `Orden ${order.orderNumber}`,
      description: `${order.customer.fullName} · ${order.vehicle.make} ${order.vehicle.model}`,
      customerName: order.customer.fullName, vehicleLabel: `${order.vehicle.make} ${order.vehicle.model}`,
      order: { id: order.id, orderNumber: order.orderNumber, customerName: order.customer.fullName, vehicleLabel: `${order.vehicle.make} ${order.vehicle.model} ${order.vehicle.year}` },
      date: order.updatedAt.toISOString(), status: order.status, to: `/ordenes/${order.id}`
    })),
    ...payments.map(payment => ({
      id: `payment-${payment.id}`, type: 'payment' as const, title: 'Pago recibido',
      description: `${payment.order.orderNumber} · ${payment.order.customer.fullName}`,
      customerName: payment.order.customer.fullName,
      order: { id: payment.order.id, orderNumber: payment.order.orderNumber, customerName: payment.order.customer.fullName, vehicleLabel: `${payment.order.vehicle.make} ${payment.order.vehicle.model} ${payment.order.vehicle.year}` },
      date: payment.paidAt.toISOString(), amount: Number(payment.amountMxn), to: `/ordenes/${payment.order.id}`
    })),
    ...expenses.map(expense => ({
      id: `expense-${expense.id}`, type: 'expense' as const, title: expense.description,
      description: expense.vendor ?? 'Gasto registrado', date: reportDayStart(expense.expenseDate.toISOString().slice(0, 10), timeZone).toISOString(),
      amount: Number(expense.amountMxn), to: '/gastos',
      order: expense.order ? { id: expense.order.id, orderNumber: expense.order.orderNumber, customerName: expense.order.customer.fullName, vehicleLabel: `${expense.order.vehicle.make} ${expense.order.vehicle.model} ${expense.order.vehicle.year}` } : null
    })),
    ...customers.map(customer => ({
      id: `customer-${customer.id}`, type: 'customer' as const, title: customer.fullName,
      description: 'Cliente registrado', date: customer.createdAt.toISOString(), to: `/clientes/${customer.id}`
    })),
    ...vehicles.map(vehicle => ({
      id: `vehicle-${vehicle.id}`, type: 'vehicle' as const, title: `${vehicle.make} ${vehicle.model} ${vehicle.year}`,
      description: vehicle.customer.fullName, date: vehicle.createdAt.toISOString(), to: `/vehiculos/${vehicle.id}`,
      customerName: vehicle.customer.fullName
    }))
  ].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))

  const countStatus = (status: string) => statuses.find(item => item.status === status)?._count._all ?? 0
  const serializeOverviewOrder = (order: Parameters<typeof serializeOrderListItem>[0]) => {
    const item = serializeOrderListItem(order)
    return canViewFinancials ? item : { ...item, total: 0, paid: 0, balance: 0 }
  }
  return {
    timeZone, updatedAt: now.toISOString(), since: activitySince.toISOString(), canViewFinancials,
    kpis: {
      collected: Number(collected?._sum.amountMxn ?? 0),
      receivable: receivables.reduce((sum, order) => sum + Math.max(0, Number(order.total) - order.payments.reduce((paid, payment) => paid + Number(payment.amountMxn), 0)), 0),
      openOrders: statuses.reduce((sum, item) => sum + item._count._all, 0), completedOrders
    },
    attention: { awaitingApproval: countStatus('AWAITING_APPROVAL'), ready: countStatus('READY'), overdue },
    activity,
    recentOrders: recentOrders.slice(0, 6).map(serializeOverviewOrder),
    upcomingDeliveries: upcomingDeliveries.map(serializeOverviewOrder)
  }
}
