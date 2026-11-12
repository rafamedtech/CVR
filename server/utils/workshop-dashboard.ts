import { orderListSelect } from './orders'
import type { CrmRequestContext } from './auth'
import type { DashboardData, ExpenseCategory, OrderStatus } from '../../app/types/crm'
import { resolveReportPeriod } from '../../shared/report-period'
import type { ConsolidationInfo } from '../../app/types/reports'
import { combineBusinessReports } from '../../shared/combine-reports'
import { readCarolinaReport, isCarolinaReportsConfigured } from './carolina-reports'
import { buildBusinessReport } from './business-report'
import { reportDateKey, reportDayStart, reportNextDay, reportPreviousPeriod } from '../../shared/report'

const openStatuses = ['ESTIMATE', 'AWAITING_APPROVAL', 'APPROVED', 'IN_PROGRESS', 'QUALITY_CONTROL', 'READY'] as const
const salesStatuses = ['APPROVED', 'IN_PROGRESS', 'QUALITY_CONTROL', 'READY', 'DELIVERED', 'LIQUIDATED'] as const

export async function getWorkshopDashboard(context: CrmRequestContext, query: Record<string, unknown>, options: {
  includeCarolina?: boolean
  allWorkshops?: boolean
  beforeTax?: boolean
  reportOnly?: boolean
} = {}): Promise<DashboardData> {
  const allBusinesses = options.includeCarolina === true
  if (allBusinesses || options.allWorkshops) requireGlobalReadAccess(context)
  const scopedWorkshopWhere = allBusinesses || options.allWorkshops ? {} : workshopWhere(context)
  const timeZone = context.selectedWorkshop?.timezone ?? 'America/Tijuana'
  let bounds: ReturnType<typeof resolveReportPeriod>
  try {
    bounds = resolveReportPeriod(query, new Date(), timeZone)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'El rango de fechas no es válido.' })
  }
  const { startKey, endKey, fullEndKey, annual } = bounds
  const from = reportDayStart(startKey, timeZone)
  const to = new Date(reportDayStart(reportNextDay(endKey), timeZone).getTime() - 1)
  const monthEnd = new Date(reportDayStart(reportNextDay(fullEndKey), timeZone).getTime() - 1)
  const previousStartKey = reportPreviousPeriod(startKey, annual)
  const previousFrom = reportDayStart(previousStartKey, timeZone)
  const previousTo = new Date(from.getTime() - 1)
  // Expense dates are stored as calendar dates at UTC midnight.
  const expenseFrom = new Date(`${startKey}T00:00:00Z`)
  const expenseTo = new Date(`${endKey}T23:59:59.999Z`)
  const previousExpenseFrom = new Date(`${previousStartKey}T00:00:00Z`)
  const previousExpenseTo = new Date(expenseFrom.getTime() - 1)

  const prisma = usePrisma()
  const role = currentWorkshopRole(context)
  const canViewFinancials = context.isSuperAdmin || role === 'MANAGER' || role === 'CASHIER' || role === 'READ_ONLY'
  const where = {
    ...scopedWorkshopWhere,
    ...assignedOrderWhere(context)
  }
  const [periodOrders, upcomingDeliveries, openOrders, allReceivableOrders, expenses, workshops, previousOrders, previousExpenses, periodPayments] = await Promise.all([
    prisma.serviceOrder.findMany({
      where: {
        ...where,
        status: { in: [...salesStatuses] },
        createdAt: { gte: from, lte: to }
      },
      select: {
        ...orderListSelect,
        taxTotal: true,
        deliveredAt: true,
        items: { select: { description: true, type: true, total: true, taxTotal: true, quantity: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    options.reportOnly
      ? Promise.resolve([])
      : prisma.serviceOrder.findMany({
          where: {
            ...where,
            status: { in: [...openStatuses] },
            promisedAt: { gte: from, lte: monthEnd }
          },
          select: orderListSelect,
          orderBy: [
            { promisedAt: 'asc' },
            { createdAt: 'desc' }
          ]
        }),
    options.reportOnly
      ? Promise.resolve(0)
      : prisma.serviceOrder.count({
          where: {
            ...where,
            status: { in: [...openStatuses] }
          }
        }),
    canViewFinancials && !options.reportOnly
      ? prisma.serviceOrder.findMany({
          where: {
            ...where,
            status: { in: [...salesStatuses] }
          },
          select: { total: true, payments: { select: { amountMxn: true } } }
        })
      : Promise.resolve([]),
    canViewFinancials
      ? prisma.expense.findMany({
          where: {
            ...scopedWorkshopWhere,
            expenseDate: { gte: expenseFrom, lte: expenseTo }
          },
          select: { workshopId: true, category: true, amountMxn: true, expenseDate: true, vendor: true }
        })
      : Promise.resolve([]),
    prisma.workshop.findMany({
      where: {
        active: allBusinesses || options.allWorkshops ? undefined : true,
        ...(!allBusinesses && !options.allWorkshops && context.workshopId ? { id: context.workshopId } : {})
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    }),
    canViewFinancials
      ? prisma.serviceOrder.findMany({
          where: { ...where, status: { in: [...salesStatuses] }, createdAt: { gte: previousFrom, lte: previousTo } },
          select: { total: true, taxTotal: true, workshopId: true }
        })
      : Promise.resolve([]),
    canViewFinancials
      ? prisma.expense.findMany({
          where: { ...scopedWorkshopWhere, expenseDate: { gte: previousExpenseFrom, lte: previousExpenseTo } },
          select: { category: true, amountMxn: true, workshopId: true }
        })
      : Promise.resolve([]),
    canViewFinancials
      ? prisma.payment.findMany({
          where: { paidAt: { gte: from, lte: to }, order: { ...where, status: { in: [...salesStatuses] } } },
          select: { amountMxn: true, paidAt: true, method: true, order: { select: { workshopId: true } } }
        })
      : Promise.resolve([])
  ])

  const sales = periodOrders.reduce((sum, order) => sum + Number(order.total), 0)
  const collected = periodPayments.reduce((sum, payment) => sum + Number(payment.amountMxn), 0)
  const materialCosts = expenses
    .filter(expense => expense.category === 'SUPPLIES')
    .reduce((sum, expense) => sum + Number(expense.amountMxn), 0)
  const operatingExpenses = expenses
    .filter(expense => expense.category !== 'SUPPLIES')
    .reduce((sum, expense) => sum + Number(expense.amountMxn), 0)
  const expenseByCategory = new Map<ExpenseCategory, number>()
  for (const expense of expenses) {
    if (expense.category === 'SUPPLIES') continue

    expenseByCategory.set(
      expense.category,
      (expenseByCategory.get(expense.category) ?? 0) + Number(expense.amountMxn)
    )
  }
  const grossProfit = sales - materialCosts
  const receivable = allReceivableOrders.reduce((sum, order) => {
    const paid = order.payments.reduce((paymentSum, payment) => paymentSum + Number(payment.amountMxn), 0)
    return sum + Math.max(0, Number(order.total) - paid)
  }, 0)
  const delivered = periodOrders.filter(order => order.status === 'DELIVERED')
  const completedDurations = delivered
    .filter(order => order.deliveredAt)
    .map(order => (order.deliveredAt!.getTime() - order.createdAt.getTime()) / 86_400_000)
  const statusMap = new Map<OrderStatus, number>()
  const trendMap = new Map<string, {
    date: string
    sales: number
    collected: number
    materialCosts: number
    expenses: number
    orders: number
    delivered: number
  }>()

  const trendKey = (date: Date) => reportDateKey(date, timeZone)
  const trendEntry = (date: Date) => {
    const key = trendKey(date)
    const current = trendMap.get(key)

    if (current) return current

    const entry = {
      date: `${key}T12:00:00.000Z`,
      sales: 0,
      collected: 0,
      materialCosts: 0,
      expenses: 0,
      orders: 0,
      delivered: 0
    }
    trendMap.set(key, entry)

    return entry
  }

  for (let day = startKey; day <= endKey; day = reportNextDay(day)) {
    trendEntry(reportDayStart(day, timeZone))
  }

  for (const order of periodOrders) {
    statusMap.set(order.status, (statusMap.get(order.status) ?? 0) + 1)
    const orderEntry = trendEntry(order.createdAt)
    orderEntry.sales += canViewFinancials ? Number(order.total) : 0
    orderEntry.orders += 1
    orderEntry.delivered += order.status === 'DELIVERED' ? 1 : 0
  }

  for (const payment of periodPayments) {
    trendEntry(payment.paidAt).collected += Number(payment.amountMxn)
  }

  if (canViewFinancials) {
    for (const expense of expenses) {
      const entry = trendEntry(reportDayStart(expense.expenseDate.toISOString().slice(0, 10), timeZone))

      if (expense.category === 'SUPPLIES') {
        entry.materialCosts += Number(expense.amountMxn)
      } else {
        entry.expenses += Number(expense.amountMxn)
      }
    }
  }

  const reportInput = {
    start: startKey, end: endKey, fullEnd: fullEndKey, annual, timeZone,
    previousDays: Math.round((Date.parse(startKey) - Date.parse(previousStartKey)) / 86400000),
    orders: periodOrders, previousOrders, expenses, previousExpenses, payments: periodPayments,
    beforeTax: options.beforeTax === true
  }
  let report = canViewFinancials ? buildBusinessReport(reportInput) : null
  let consolidation: ConsolidationInfo | null = null
  if (allBusinesses && report) {
    const sources = workshops.map(workshop => ({
      id: workshop.id, name: workshop.name,
      report: buildBusinessReport({
        ...reportInput,
        orders: periodOrders.filter(order => order.workshopId === workshop.id),
        previousOrders: previousOrders.filter(order => order.workshopId === workshop.id),
        expenses: expenses.filter(expense => expense.workshopId === workshop.id),
        previousExpenses: previousExpenses.filter(expense => expense.workshopId === workshop.id),
        payments: periodPayments.filter(payment => payment.order.workshopId === workshop.id)
      })
    }))
    consolidation = { status: 'not-configured', businesses: sources.map(source => ({ id: source.id, name: source.name, metrics: source.report.metrics })), internalOperations: null }
    if (isCarolinaReportsConfigured()) {
      try {
        const carolina = await readCarolinaReport(report.period)
        carolina.internalOperations.workshopMaterialPurchases = expenses
          .filter(expense => expense.category === 'SUPPLIES' && /carolina\s+pinturas/i.test(expense.vendor ?? ''))
          .reduce((sum, expense) => sum + Number(expense.amountMxn), 0)
        sources.push({ id: 'carolina-pinturas', name: 'Carolina Pinturas', report: carolina.report })
        report = combineBusinessReports(sources)
        consolidation = { carolinaInventory: carolina.inventory, status: 'connected', businesses: sources.map(source => ({ id: source.id, name: source.name, metrics: source.report.metrics })), internalOperations: carolina.internalOperations }
      } catch {
        consolidation.status = 'unavailable'
        console.warn('[carolina-reports] No se pudo consultar el reporte de Carolina Pinturas.')
      }
    }
  }

  return {
    canViewFinancials,
    report,
    consolidation,
    period: {
      from: from.toISOString(),
      to: to.toISOString()
    },
    trend: [...trendMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
    kpis: {
      sales: canViewFinancials ? sales : 0,
      collected: canViewFinancials ? collected : 0,
      costs: canViewFinancials ? materialCosts : 0,
      materialCosts: canViewFinancials ? materialCosts : 0,
      grossProfit: canViewFinancials ? grossProfit : 0,
      expenses: canViewFinancials ? operatingExpenses : 0,
      netProfit: canViewFinancials ? grossProfit - operatingExpenses : 0,
      receivable: canViewFinancials ? receivable : 0,
      openOrders,
      completedOrders: delivered.length,
      averageTicket: canViewFinancials && periodOrders.length ? sales / periodOrders.length : 0,
      averageDays: completedDurations.length
        ? completedDurations.reduce((sum, days) => sum + days, 0) / completedDurations.length
        : 0
    },
    expenseBreakdown: canViewFinancials
      ? [...expenseByCategory.entries()]
          .map(([category, amount]) => ({ category, amount }))
          .sort((a, b) => b.amount - a.amount)
      : [],
    statusCounts: [...statusMap.entries()].map(([status, count]) => ({ status, count })),
    workshops: workshops.map((workshop) => {
      const orders = periodOrders.filter(order => order.workshopId === workshop.id)
      const workshopExpenses = expenses
        .filter(expense => expense.workshopId === workshop.id)
        .reduce((sum, expense) => sum + Number(expense.amountMxn), 0)

      return {
        id: workshop.id,
        name: workshop.name,
        sales: canViewFinancials ? orders.reduce((sum, order) => sum + Number(order.total), 0) : 0,
        collected: canViewFinancials
          ? periodPayments.filter(payment => payment.order.workshopId === workshop.id)
              .reduce((sum, payment) => sum + Number(payment.amountMxn), 0)
          : 0,
        expenses: canViewFinancials ? workshopExpenses : 0,
        openOrders: orders.filter(order => openStatuses.includes(order.status as typeof openStatuses[number])).length
      }
    }),
    recentOrders: periodOrders.slice(0, 6).map(serializeOrderListItem),
    upcomingDeliveries: upcomingDeliveries.map(serializeOrderListItem)
  }
}
