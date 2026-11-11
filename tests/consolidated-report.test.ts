import assert from 'node:assert/strict'
import test from 'node:test'
import { buildBusinessReport } from '../server/utils/business-report'
import { buildCarolinaReport } from '../server/utils/carolina-reports'
import { combineBusinessReports } from '../shared/combine-reports'
import { groupBusinessSalesChannels } from '../shared/report-sales-channels'
import { readReportPages } from '../server/utils/report-pagination'

const period = { mode: 'monthly' as const, start: '2026-09-01', end: '2026-09-30', totalDays: 30, elapsedDays: 30, label: 'Septiembre 2026' }
const input = { start: period.start, end: period.end, fullEnd: period.end, previousDays: 31, annual: false, timeZone: 'UTC', beforeTax: true, orders: [], previousOrders: [], expenses: [], previousExpenses: [], payments: [] }

function workshop(total = 1160, taxTotal = 160) {
  return buildBusinessReport({ ...input, orders: [{ total, taxTotal, createdAt: new Date('2026-09-10T12:00:00Z'), customerId: 'same-id', customer: { fullName: 'Cliente taller' }, workshopId: 'workshop', workshop: { name: 'Taller' }, payments: [{ amountMxn: 580 }], items: [{ description: 'Servicio', type: 'SERVICE', total, taxTotal, quantity: 1 }] }] })
}
function carolina() {
  return buildCarolinaReport(period, {
    orders: [
      { id: 'one', date: '2026-09-10', total: '2320', tax: '320', customerId: 'same-id', customer: 'Cliente Carolina', internal: true, paid: '1160', items: [{ description: 'Pintura', type: 'Esmaltes', total: 3480, taxTotal: 480, quantity: 2 }] },
      { id: 'old', date: '2026-08-10', total: '1160', tax: '160', customerId: 'old', customer: 'Anterior', internal: true, paid: '0', items: [] }
    ],
    expenses: [
      { date: '2026-09-01', category: 'SUPPLIES', amount: '500', vendor: 'Proveedor' },
      { date: '2026-09-10', category: 'Nómina', amount: '200', vendor: 'Colaborador' },
      { date: '2026-08-10', category: 'SUPPLIES', amount: '100', vendor: 'Proveedor' }
    ],
    payments: [{ date: '2026-09-10', amount: '1160', method: 'efectivo', internal: true }]
  })
}

test('Carolina reproduces net sales, discounts, gross receivables and internal operations', () => {
  const { report, internalOperations } = carolina()
  assert.equal(report.metrics.sales, 2000)
  assert.equal(report.metrics.billedSales, 2320)
  assert.equal(report.metrics.netProfit, 1300)
  assert.equal(report.metrics.previousSales, 1000)
  assert.equal(report.metrics.previousMaterialPurchases, 100)
  assert.equal(report.metrics.outstandingBalance, 1160)
  assert.equal(report.metrics.collectionCoveragePercentage, 50)
  assert.equal(report.salesByLine[0]?.amount, 2000)
  assert.equal(report.topServices[0]?.amount, 2000)
  assert.equal(report.dailyMovements[0]?.materialPurchases, 500)
  assert.equal(report.paymentMethods[0]?.key, 'CASH')
  assert.equal(internalOperations.sales, 2000)
  assert.equal(internalOperations.previousSales, 1000)
  assert.equal(internalOperations.collections, 1160)
  assert.equal(internalOperations.orderCount, 1)
})

test('combined report recomputes margins and coverage from summed amounts', () => {
  const local = workshop()
  const source = carolina().report
  const combined = combineBusinessReports([{ id: 'workshops', name: 'Talleres', report: local }, { id: 'carolina', name: 'Carolina', report: source }])
  assert.equal(combined.metrics.sales, 3000)
  assert.equal(combined.metrics.billedSales, 3480)
  assert.equal(combined.metrics.materialPurchases, 500)
  assert.equal(combined.metrics.operatingExpenses, 200)
  assert.equal(combined.metrics.netProfit, 2300)
  assert.equal(combined.metrics.netMarginPercentage, 76.7)
  assert.equal(combined.metrics.collections, 1160)
  assert.equal(combined.metrics.outstandingBalance, 1740)
  assert.equal(combined.metrics.collectionCoveragePercentage, 50)
  assert.equal(combined.metrics.orderCount, 2)
  assert.equal(combined.metrics.averageTicket, 1500)
  assert.equal(combined.dailyMovements.reduce((sum, day) => sum + day.netProfit, 0), 2300)
  assert.equal(combined.salesByWorkshop.reduce((sum, item) => sum + item.amount, 0), 3000)
  assert.equal(combined.salesChannels?.reduce((sum, item) => sum + item.amount, 0), 3000)
  assert.equal(combined.salesChannels?.find(item => item.key === 'workshop')?.amount, 1000)
  assert.equal(combined.salesChannels?.find(item => item.key === 'internal')?.previousAmount, 1000)
})

test('Carolina channels match customer classification and compare net sales with the previous period', () => {
  const order = { id: 'sale', date: '2026-09-10', total: '116', tax: '16', customerId: 'customer', customer: 'Cliente', internal: false, paid: '0', items: [] }
  const { report } = buildCarolinaReport(period, {
    orders: [
      { ...order, customer: 'mostrador .' },
      { ...order, customer: 'MOSTRADOR' },
      { ...order, customer: 'MOSTRADOR', internal: true },
      { ...order },
      { ...order, date: '2026-08-10', customer: 'MOSTRADOR', total: '232', tax: '32' },
      { ...order, date: '2026-08-10', internal: true }
    ], expenses: [], payments: []
  })
  assert.deepEqual(report.salesChannels?.map(({ key, amount, count, percentage, previousAmount }) => ({ key, amount, count, percentage, previousAmount })), [
    { key: 'counter', amount: 200, count: 2, percentage: 50, previousAmount: 200 },
    { key: 'seller', amount: 100, count: 1, percentage: 25, previousAmount: 0 },
    { key: 'internal', amount: 100, count: 1, percentage: 25, previousAmount: 100 }
  ])
  const empty = buildCarolinaReport(period, { orders: [], expenses: [], payments: [] }).report
  assert.equal(empty.salesChannels?.length, 3)
  assert.ok(empty.salesChannels?.every(channel => channel.amount === 0 && channel.percentage === 0))
})

test('internal sales remain in the total and equal customer IDs from different databases remain distinct', () => {
  const combined = combineBusinessReports([{ id: 'workshops', name: 'Talleres', report: workshop() }, { id: 'carolina', name: 'Carolina', report: carolina().report }])
  assert.equal(combined.metrics.sales, 3000)
  assert.equal(combined.topCustomers.length, 2)
  assert.notEqual(combined.topCustomers[0]?.id, combined.topCustomers[1]?.id)
  assert.equal(combined.topCustomers[0]?.detail, 'Carolina')
})

test('reports with incompatible dates or tax bases cannot be silently added', () => {
  const report = workshop()
  assert.throws(() => combineBusinessReports([]))
  assert.throws(() => combineBusinessReports([{ id: 'one', name: 'Uno', report }, { id: 'two', name: 'Dos', report: { ...report, period: { ...report.period, end: '2026-09-29' } } }]))
  assert.throws(() => combineBusinessReports([{ id: 'one', name: 'Uno', report: { ...report, taxBasis: 'as-recorded' } }]))
})

test('pagination reads every row beyond the default PostgREST limit', async () => {
  const rows = Array.from({ length: 1250 }, (_, id) => ({ id }))
  const ranges: number[][] = []
  const result = await readReportPages(async (from, to) => {
    ranges.push([from, to])
    return { data: rows.slice(from, to + 1), error: null }
  })
  assert.equal(result.length, 1250)
  assert.deepEqual(ranges, [[0, 499], [500, 999], [1000, 1499]])
})

test('pagination checks the final empty page and fails on incomplete reads', async () => {
  const ranges: number[][] = []
  const result = await readReportPages(async (from, to) => {
    ranges.push([from, to])
    return { data: from === 0 ? [1, 2] : [], error: null }
  }, 2)
  assert.deepEqual(result, [1, 2])
  assert.deepEqual(ranges, [[0, 1], [2, 3]])
  await assert.rejects(() => readReportPages(async () => ({ data: null, error: { message: 'Network failure' } })))
  await assert.rejects(() => readReportPages(async () => ({ data: null, error: null })))
})

test('separa Carolina de los talleres y calcula la participación dentro de cada bloque', () => {
  const bodyShop = workshop()
  const mechanical = workshop(580, 80)
  bodyShop.metrics.previousSales = 800
  const paintStore = carolina().report
  const sources = [
    { id: 'body-shop', name: 'Carrocería', report: bodyShop },
    { id: 'mechanical', name: 'Mecánica', report: mechanical },
    { id: 'carolina-pinturas', name: 'Carolina Pinturas', report: paintStore }
  ]
  const combined = combineBusinessReports(sources)
  const groups = groupBusinessSalesChannels(combined.salesChannels ?? [], sources.map(source => ({ id: source.id, name: source.name, metrics: source.report.metrics })))
  assert.equal(groups.carolina.reduce((sum, channel) => sum + channel.amount, 0), 2000)
  assert.equal(groups.carolina.find(channel => channel.key === 'internal')?.percentage, 100)
  assert.equal(groups.carolina.find(channel => channel.key === 'internal')?.previousAmount, 1000)
  assert.deepEqual(groups.workshops.map(channel => ({ key: channel.key, amount: channel.amount, percentage: channel.percentage })), [
    { key: 'body-shop', amount: 1000, percentage: 66.7 },
    { key: 'mechanical', amount: 500, percentage: 33.3 }
  ])
  assert.equal(groups.workshops[0]?.previousAmount, 800)
  assert.equal(groups.workshops[0]?.count, 1)
  assert.equal(groups.carolina.reduce((sum, channel) => sum + channel.amount, 0) + groups.workshops.reduce((sum, channel) => sum + channel.amount, 0), combined.metrics.sales)
})

test('conserva los talleres por separado sin Carolina y muestra porcentajes válidos sin ventas', () => {
  const empty = buildBusinessReport(input)
  const businesses = [
    { id: 'body-shop', name: 'Carrocería', metrics: empty.metrics },
    { id: 'mechanical', name: 'Mecánica', metrics: empty.metrics }
  ]
  const groups = groupBusinessSalesChannels(empty.salesChannels ?? [], businesses)
  assert.equal(groups.carolina.length, 0)
  assert.equal(groups.workshops.length, 2)
  assert.ok(groups.workshops.every(channel => channel.amount === 0 && channel.percentage === 0))
})
