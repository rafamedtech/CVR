import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import * as reportDates from '../shared/report'
import type { DashboardOverviewData } from '../app/types/crm'

const source = ts.transpileModule(
  readFileSync(new URL('../server/utils/dashboard-overview.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
).outputText

function fixture(role = 'MANAGER') {
  const calls: Array<{ model: string, method: string, args: Record<string, unknown> }> = []
  const now = new Date('2026-11-11T20:00:00Z')
  const order = { id: 'order-1', updatedAt: new Date('2026-11-10T20:00:00Z'), status: 'ESTIMATE', orderNumber: 'OT-1', customer: { fullName: 'Cliente' }, vehicle: { make: 'Ford', model: 'Ranger', year: 2020 } }
  const result = (model: string, method: string, args: Record<string, unknown>) => {
    calls.push({ model, method, args })
    if (model === 'serviceOrder' && method === 'groupBy') return [{ status: 'ESTIMATE', _count: { _all: 2 } }, { status: 'READY', _count: { _all: 1 } }]
    if (model === 'serviceOrder' && method === 'count') return 1
    if (model === 'serviceOrder' && method === 'findMany') {
      if ('updatedAt' in (args.select as object)) return [order, { ...order, id: 'old-order', updatedAt: new Date('2026-11-04T20:00:00Z') }]
      if ('payments' in (args.select as object) && !('id' in (args.select as object))) return [{ total: 100, payments: [{ amountMxn: 30 }] }, { total: 50, payments: [{ amountMxn: 60 }] }]
      return []
    }
    if (model === 'payment' && method === 'aggregate') return { _sum: { amountMxn: 30 } }
    if (model === 'payment') return [{ id: 'pay-1', amountMxn: 30, paidAt: new Date('2026-11-11T18:00:00Z'), order: { id: 'order-1', orderNumber: 'OT-1', customer: { fullName: 'Cliente' }, vehicle: { make: 'Ford', model: 'Ranger', year: 2020 } } }]
    if (model === 'expense') return [
      { id: 'expense-1', amountMxn: 20, expenseDate: new Date('2026-11-11T00:00:00Z'), description: 'Material', vendor: null, order: null },
      { id: 'expense-2', amountMxn: 10, expenseDate: new Date('2026-11-11T00:00:00Z'), description: 'Refacción', vendor: null, order }
    ]
    if (model === 'customer') return [{ id: 'customer-1', fullName: 'Cliente', createdAt: new Date('2026-11-09T10:00:00Z') }]
    if (model === 'vehicle') return [{ id: 'vehicle-1', make: 'Ford', model: 'Ranger', year: 2020, customer: { fullName: 'Cliente' }, createdAt: new Date('2026-11-08T10:00:00Z') }]
    throw new Error(`Unexpected query: ${model}.${method}`)
  }
  const prisma = Object.fromEntries(['serviceOrder', 'payment', 'expense', 'customer', 'vehicle'].map(model => [model,
    Object.fromEntries(['findMany', 'groupBy', 'count', 'aggregate'].map(method => [method, async (args: Record<string, unknown>) => result(model, method, args)]))
  ]))
  const exports: { getDashboardOverview?: (context: unknown, now: Date) => Promise<DashboardOverviewData> } = {}
  runInNewContext(source, {
    exports, Date,
    require: (path: string) => path.includes('/orders') ? { orderListSelect: { id: true } } : reportDates,
    usePrisma: () => prisma,
    currentWorkshopRole: () => role,
    workshopWhere: () => ({ workshopId: 'workshop-1' }),
    assignedOrderWhere: () => role === 'TECHNICIAN' ? { assignedToId: 'tech-1' } : {},
    customerAccessWhere: () => ({ workshops: { some: { workshopId: 'workshop-1' } } }),
    vehicleAccessWhere: () => ({ workshops: { some: { workshopId: 'workshop-1' } } }),
    serializeOrderListItem: (value: unknown) => value
  })
  return { run: () => exports.getDashboardOverview!({ isSuperAdmin: false, selectedWorkshop: { timezone: 'America/Tijuana' } }, now), calls }
}

test('el resumen combina actividad real por fecha y calcula saldos sin restar sobrepagos', async () => {
  const app = fixture()
  const data = await app.run()
  assert.equal(data.kpis.collected, 30)
  assert.equal(data.kpis.receivable, 70)
  assert.equal(data.kpis.openOrders, 3)
  assert.equal(data.attention.ready, 1)
  assert.equal(data.activity.length, 6)
  assert.equal(data.activity[0]?.type, 'payment')
  assert.equal(data.activity.find(item => item.id === 'expense-expense-1')?.order, null)
  assert.equal(data.activity.find(item => item.id === 'expense-expense-2')?.order?.id, 'order-1')
  assert.equal(data.activity.find(item => item.type === 'payment')?.order?.orderNumber, 'OT-1')
  assert.equal(data.activity.find(item => item.type === 'order')?.customerName, 'Cliente')
  assert.equal(data.activity.find(item => item.type === 'order')?.status, 'ESTIMATE')
  // Expense dates are calendar dates: UTC midnight must still display November 11 in Tijuana.
  const expense = data.activity.find(item => item.type === 'expense')!
  assert.equal(reportDates.reportDateKey(new Date(expense.date), 'America/Tijuana'), '2026-11-11')
  assert.equal(data.since, '2026-11-05T08:00:00.000Z')
  assert.equal(data.activity.some(item => item.id === 'order-old-order'), false)
  const paymentQuery = app.calls.find(call => call.model === 'payment' && call.method === 'findMany')!
  assert.equal((paymentQuery.args.where as { paidAt: { gte: Date } }).paidAt.gte.toISOString(), data.since)
  const customerQuery = app.calls.find(call => call.model === 'customer')!
  assert.equal((customerQuery.args.where as { createdAt: { gte: Date } }).createdAt.gte.toISOString(), data.since)
  const collectedQuery = app.calls.find(call => call.model === 'payment' && call.method === 'aggregate')!
  assert.equal((collectedQuery.args.where as { paidAt: { gte: Date } }).paidAt.gte.toISOString(), '2026-10-13T07:00:00.000Z')
})

for (const role of ['TECHNICIAN', 'ADVISOR']) {
  test(`${role}: no consulta movimientos financieros y conserva el alcance del taller`, async () => {
    const app = fixture(role)
    const data = await app.run()
    assert.equal(data.canViewFinancials, false)
    assert.equal(data.kpis.collected, 0)
    assert.equal(data.kpis.receivable, 0)
    assert.equal(data.recentOrders.every(order => order.total === 0 && order.paid === 0 && order.balance === 0), true)
    assert.equal(app.calls.some(call => ['payment', 'expense'].includes(call.model)), false)
    assert.equal(data.activity.some(item => item.type === 'payment' || item.type === 'expense'), false)
    const orderQueries = app.calls.filter(call => call.model === 'serviceOrder')
    for (const call of orderQueries) {
      const where = call.args.where as Record<string, unknown>
      assert.equal(where.workshopId, 'workshop-1')
      if (role === 'TECHNICIAN') assert.equal(where.assignedToId, 'tech-1')
    }
    for (const call of app.calls.filter(call => ['customer', 'vehicle'].includes(call.model))) {
      assert.equal(JSON.stringify(call.args.where).includes('workshop-1'), true)
    }
  })
}

test('consulta pendientes sin antigüedad y limita entregas a siete días del taller', async () => {
  const app = fixture()
  await app.run()
  const openQuery = app.calls.find(call => call.method === 'groupBy')!
  assert.equal('createdAt' in (openQuery.args.where as object), false)
  const deliveryQuery = app.calls.find(call => call.model === 'serviceOrder' && call.method === 'findMany' && (call.args.where as Record<string, unknown>).promisedAt)!
  const date = (deliveryQuery.args.where as { promisedAt: { gte: Date, lt: Date } }).promisedAt
  assert.equal(date.gte.toISOString(), '2026-11-11T08:00:00.000Z')
  assert.equal(date.lt.toISOString(), '2026-11-18T08:00:00.000Z')
  assert.equal(deliveryQuery.args.take, 6)
})
