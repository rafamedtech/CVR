import type { BusinessReportSummary, ReportBreakdownItem, ReportRankingItem } from '../../app/types/reports'
import type { Expense, Payment, ServiceOrder, OrderItem } from '../../generated/prisma/client'
import { reportChange, reportPercentage, reportDateKey, reportNextDay } from '../../shared/report'

type ReportOrder = ServiceOrder & {
  customer: { fullName: string }
  workshop: { name: string }
  payments: Payment[]
  items: OrderItem[]
}

type GroupEntry = { key: string, label: string, amount: number, count: number }
function add(groups: Map<string, GroupEntry>, key: string, label: string, amount: number, count = 1) {
  const entry = groups.get(key) ?? { key, label, amount: 0, count: 0 }
  entry.amount += amount
  entry.count += count
  groups.set(key, entry)
}
function breakdown(groups: Map<string, GroupEntry>): ReportBreakdownItem[] {
  const total = [...groups.values()].reduce((sum, entry) => sum + entry.amount, 0)
  return [...groups.values()].sort((a, b) => b.amount - a.amount)
    .map(entry => ({ ...entry, percentage: reportPercentage(entry.amount, total) ?? 0 }))
}
function ranking(groups: Map<string, GroupEntry>, detail: string): ReportRankingItem[] {
  return breakdown(groups).slice(0, 5).map(entry => ({ ...entry, id: entry.key, detail }))
}
function summarize(orders: Pick<ServiceOrder, 'total'>[], expenses: Pick<Expense, 'category' | 'amountMxn'>[]) {
  const sales = orders.reduce((sum, order) => sum + Number(order.total), 0)
  const material = expenses.filter(e => e.category === 'SUPPLIES').reduce((sum, e) => sum + Number(e.amountMxn), 0)
  const operating = expenses.filter(e => e.category !== 'SUPPLIES').reduce((sum, e) => sum + Number(e.amountMxn), 0)
  return { sales, material, operating, gross: sales - material, net: sales - material - operating }
}

export function buildBusinessReport(input: {
  start: string
  end: string
  fullEnd: string
  previousDays: number
  annual: boolean
  timeZone: string
  orders: ReportOrder[]
  previousOrders: Pick<ServiceOrder, 'total'>[]
  expenses: Expense[]
  previousExpenses: Pick<Expense, 'category' | 'amountMxn'>[]
  payments: Payment[]
}): BusinessReportSummary {
  const { start, end, fullEnd, annual, timeZone, orders, expenses, payments } = input
  const current = summarize(orders, expenses)
  const previous = summarize(input.previousOrders, input.previousExpenses)
  const days = (last: string) => Math.round((Date.parse(last) - Date.parse(start)) / 86400000) + 1
  const daily = new Map<string, BusinessReportSummary['dailyMovements'][number]>()
  for (let day = start; day <= end; day = reportNextDay(day)) {
    daily.set(day, { date: day, label: day, sales: 0, orderCount: 0, collections: 0, expenses: 0, netCashFlow: 0, materialPurchases: 0, operatingExpenses: 0, netProfit: 0 })
  }
  const customers = new Map<string, GroupEntry>()
  const debtors = new Map<string, GroupEntry>()
  const workshops = new Map<string, GroupEntry>()
  const lines = new Map<string, GroupEntry>()
  const services = new Map<string, GroupEntry>()
  const providers = new Map<string, GroupEntry>()
  const categories = new Map<string, GroupEntry>()
  const methods = new Map<string, GroupEntry>()
  const dayOf = (date: Date) => daily.get(reportDateKey(date, timeZone))
  let outstanding = 0
  for (const order of orders) {
    const amount = Number(order.total)
    const day = dayOf(order.createdAt)
    if (day) {
      day.sales += amount
      day.orderCount++
    }
    add(customers, order.customerId, order.customer.fullName, amount)
    add(workshops, order.workshopId, order.workshop.name, amount)
    const paid = order.payments.reduce((sum, payment) => sum + Number(payment.amountMxn), 0)
    const balance = Math.max(0, amount - paid)
    outstanding += balance
    if (balance > 0) add(debtors, order.customerId, order.customer.fullName, balance)
    for (const item of order.items) {
      add(lines, item.type, item.type, Number(item.total))
      add(services, item.description, item.description, Number(item.total), Number(item.quantity))
    }
  }
  for (const expense of expenses) {
    const amount = Number(expense.amountMxn)
    const day = daily.get(expense.expenseDate.toISOString().slice(0, 10))
    if (day) {
      day.expenses += amount
      if (expense.category === 'SUPPLIES') day.materialPurchases += amount
      else day.operatingExpenses += amount
    }
    if (expense.category === 'SUPPLIES') add(providers, expense.vendor || 'Sin proveedor', expense.vendor || 'Sin proveedor', amount)
    else add(categories, expense.category, expense.category, amount)
  }
  let collections = 0
  for (const payment of payments) {
    collections += Number(payment.amountMxn)
    const day = dayOf(payment.paidAt)
    if (day) day.collections += Number(payment.amountMxn)
    add(methods, payment.method, payment.method, Number(payment.amountMxn))
  }
  return {
    period: { mode: annual ? 'annual' : 'monthly', start, end, label: `${start.split('-').reverse().join('/')} – ${end.split('-').reverse().join('/')}`, elapsedDays: days(end), totalDays: days(fullEnd) },
    metrics: {
      sales: current.sales, previousSales: previous.sales, salesChangePercentage: reportChange(current.sales, previous.sales),
      materialPurchases: current.material, previousMaterialPurchases: previous.material, materialPurchasesChangePercentage: reportChange(current.material, previous.material),
      operatingExpenses: current.operating, previousOperatingExpenses: previous.operating, operatingExpensesChangePercentage: reportChange(current.operating, previous.operating),
      grossProfit: current.gross, previousGrossProfit: previous.gross, grossMarginPercentage: reportPercentage(current.gross, current.sales),
      netProfit: current.net, previousNetProfit: previous.net, netMarginPercentage: reportPercentage(current.net, current.sales), previousNetMarginPercentage: reportPercentage(previous.net, previous.sales),
      previousDays: input.previousDays, collections, netCashFlow: collections - current.material - current.operating,
      orderCount: orders.length, averageTicket: orders.length ? current.sales / orders.length : 0,
      outstandingBalance: outstanding, collectionCoveragePercentage: reportPercentage(current.sales - outstanding, current.sales) ?? 0
    },
    dailyMovements: [...daily.values()].map(day => ({ ...day, netCashFlow: day.collections - day.expenses, netProfit: day.sales - day.expenses })),
    salesByWorkshop: breakdown(workshops), salesByLine: breakdown(lines), paymentMethods: breakdown(methods), operatingExpenseCategories: breakdown(categories),
    topCustomers: ranking(customers, 'Cliente'), topDebtors: ranking(debtors, 'Saldo pendiente'), topServices: ranking(services, 'Concepto de orden'), topMaterialProviders: ranking(providers, 'Proveedor')
  }
}
