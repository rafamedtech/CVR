import assert from 'node:assert/strict'
import test from 'node:test'
import { Prisma } from '../generated/prisma/client'
import { buildBusinessReport } from '../server/utils/business-report'
import { reportChange, reportDateKey, reportDayStart, reportNextDay, reportPercentage, reportPreviousPeriod } from '../shared/report'
import { reportWeeks, reportMonths } from '../app/utils/reportPeriods'

type Input = Parameters<typeof buildBusinessReport>[0]
type Order = Input['orders'][number]
type Payment = Input['payments'][number]
type Expense = Input['expenses'][number]
const money = (value: number) => new Prisma.Decimal(value)
const payment = (amount: number, date = '2026-09-10T19:00:00Z') => ({ amountMxn: money(amount), paidAt: new Date(date), method: 'CASH' }) as Payment
const expense = (amount: number, category: 'SUPPLIES' | 'PAYROLL') => ({ amountMxn: money(amount), expenseDate: new Date('2026-09-01T00:00:00Z'), category, vendor: 'Proveedor' }) as Expense
function order(amount: number, payments: Payment[] = []): Order {
  return {
    id: 'order', customerId: 'customer', workshopId: 'workshop', total: money(amount),
    createdAt: new Date('2026-09-01T07:00:00Z'), customer: { fullName: 'Cliente' }, workshop: { name: 'Carrocería' }, payments,
    items: [{ description: 'Reparación', type: 'LABOR', total: money(amount), quantity: money(1) }]
  } as Order
}
const input = (overrides: Partial<Input> = {}): Input => ({
  start: '2026-09-01', end: '2026-09-30', fullEnd: '2026-09-30', previousDays: 31, annual: false, timeZone: 'America/Tijuana',
  orders: [], previousOrders: [], expenses: [], previousExpenses: [], payments: [], ...overrides
})

test('report dates honor Tijuana midnight and daylight saving transitions', () => {
  assert.equal(reportDayStart('2026-09-01', 'America/Tijuana').toISOString(), '2026-09-01T07:00:00.000Z')
  assert.equal(reportDayStart('2026-11-02', 'America/Tijuana').toISOString(), '2026-11-02T08:00:00.000Z')
  assert.equal(reportDateKey(new Date('2026-09-01T06:59:59Z'), 'America/Tijuana'), '2026-08-31')
  assert.equal(reportNextDay('2024-02-28'), '2024-02-29')
  assert.equal(reportPreviousPeriod('2026-01-01', false), '2025-12-01')
  assert.equal(reportPreviousPeriod('2026-01-01', true), '2025-01-01')
})

test('report reconciles sales, materials, operating expenses and previous-period profit', () => {
  const report = buildBusinessReport(input({ orders: [order(1000)], previousOrders: [order(800)], expenses: [expense(400, 'SUPPLIES'), expense(200, 'PAYROLL')] }))
  assert.equal(report.metrics.grossProfit, 600)
  assert.equal(report.metrics.netProfit, 400)
  assert.equal(report.metrics.netMarginPercentage, 40)
  assert.equal(report.metrics.salesChangePercentage, 25)
  assert.equal(report.metrics.previousNetProfit, 800)
  assert.equal(report.metrics.outstandingBalance, 1000)
  assert.equal(report.topCustomers[0]?.amount, 1000)
  assert.equal(report.salesByLine[0]?.amount, 1000)
  assert.equal(report.topMaterialProviders[0]?.amount, 400)
  assert.equal(report.operatingExpenseCategories[0]?.amount, 200)
})

test('collections include payments for older orders and balances use all payments on period orders', () => {
  const report = buildBusinessReport(input({
    orders: [order(1000, [payment(250), payment(100, '2026-10-02T19:00:00Z')])],
    payments: [payment(250), payment(500)], expenses: [expense(200, 'PAYROLL')]
  }))
  assert.equal(report.metrics.collections, 750)
  assert.equal(report.metrics.outstandingBalance, 650)
  assert.equal(report.metrics.collectionCoveragePercentage, 35)
  assert.equal(report.metrics.netCashFlow, 550)
  assert.equal(report.paymentMethods[0]?.amount, 750)
  assert.equal(report.topDebtors[0]?.amount, 650)
})

test('weekly and monthly chart totals reconcile with the financial statement', () => {
  const report = buildBusinessReport(input({ orders: [order(1000)], expenses: [expense(400, 'SUPPLIES'), expense(200, 'PAYROLL')] }))
  const weeks = reportWeeks(report.dailyMovements)
  assert.equal(weeks.length, 5)
  assert.equal(weeks[0]?.start, '2026-09-01')
  assert.equal(weeks.at(-1)?.end, '2026-09-30')
  assert.equal(weeks.reduce((sum, week) => sum + week.netProfit, 0), report.metrics.netProfit)
  assert.equal(reportMonths(report.dailyMovements)[0]?.sales, report.metrics.sales)
  assert.equal(report.period.elapsedDays, 30)
  assert.equal(report.dailyMovements[0]?.sales, 1000)
  assert.equal(report.dailyMovements[0]?.materialPurchases, 400)
})

test('empty periods, losses, zero comparison base and leap years remain meaningful', () => {
  const empty = buildBusinessReport(input())
  assert.equal(empty.metrics.netMarginPercentage, null)
  assert.equal(empty.metrics.salesChangePercentage, null)
  assert.equal(empty.metrics.collectionCoveragePercentage, 0)
  assert.equal(empty.dailyMovements.length, 30)
  const loss = buildBusinessReport(input({ orders: [order(100)], expenses: [expense(200, 'SUPPLIES')] }))
  assert.equal(loss.metrics.netMarginPercentage, -100)
  assert.equal(reportChange(100, -100), 200)
  assert.equal(reportPercentage(100, 0), null)
  const annual = buildBusinessReport(input({ start: '2024-01-01', end: '2024-12-31', fullEnd: '2024-12-31', annual: true }))
  assert.equal(annual.period.totalDays, 366)
  assert.equal(reportMonths(annual.dailyMovements).length, 12)
})
