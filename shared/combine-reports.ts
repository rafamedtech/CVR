import type { BusinessReportSummary, ReportBreakdownItem, ReportRankingItem, ReportSalesChannel } from '../app/types/reports'
import { reportChange, reportPercentage } from './report'

export function combineBusinessReports(sources: Array<{ id: string, name: string, report: BusinessReportSummary }>): BusinessReportSummary {
  const first = sources[0]?.report
  if (!first || sources.some(({ report }) => report.taxBasis !== 'before-tax'
    || report.period.start !== first.period.start || report.period.end !== first.period.end
    || report.period.mode !== first.period.mode)) {
    throw new Error('Los reportes deben compartir periodo y base de ventas antes de IVA.')
  }
  const sum = (key: keyof BusinessReportSummary['metrics']) => sources.reduce((total, source) => total + (source.report.metrics[key] ?? 0), 0)
  const sales = sum('sales')
  const previousSales = sum('previousSales')
  const material = sum('materialPurchases')
  const previousMaterial = sum('previousMaterialPurchases')
  const operating = sum('operatingExpenses')
  const previousOperating = sum('previousOperatingExpenses')
  const net = sales - material - operating
  const previousNet = previousSales - previousMaterial - previousOperating
  const billed = sum('billedSales')
  const outstanding = sum('outstandingBalance')
  const count = sum('orderCount')
  const channels = new Map<string, ReportSalesChannel>()
  for (const { report } of sources) {
    for (const channel of report.salesChannels ?? []) {
      const group = channels.get(channel.key) ?? { ...channel, amount: 0, count: 0, previousAmount: 0 }
      group.amount += channel.amount
      group.count += channel.count
      group.previousAmount += channel.previousAmount
      channels.set(channel.key, group)
    }
  }
  function breakdown(key: 'paymentMethods' | 'operatingExpenseCategories' | 'salesByLine' | 'salesByWorkshop'): ReportBreakdownItem[] {
    const groups = new Map<string, ReportBreakdownItem>()
    for (const source of sources) {
      for (const item of source.report[key]) {
        const group = groups.get(item.key) ?? { ...item, amount: 0, count: 0 }
        group.amount += item.amount
        group.count += item.count
        groups.set(item.key, group)
      }
    }
    const total = [...groups.values()].reduce((amount, item) => amount + item.amount, 0)
    return [...groups.values()].map(item => ({ ...item, percentage: reportPercentage(item.amount, total) ?? 0 })).sort((a, b) => b.amount - a.amount)
  }
  function ranking(key: 'topCustomers' | 'topDebtors' | 'topServices' | 'topMaterialProviders', denominator: number): ReportRankingItem[] {
    return sources.flatMap(source => source.report[key].map(item => ({
      ...item, id: `${source.id}:${item.id}`, detail: source.name,
      percentage: reportPercentage(item.amount, denominator) ?? 0
    }))).sort((a, b) => b.amount - a.amount).slice(0, 5)
  }
  const movements = new Map<string, BusinessReportSummary['dailyMovements'][number]>()
  const dailyKeys = ['sales', 'orderCount', 'collections', 'expenses', 'netCashFlow', 'materialPurchases', 'operatingExpenses', 'netProfit'] as const
  for (const source of sources) {
    for (const item of source.report.dailyMovements) {
      const day = movements.get(item.date)
      if (!day) movements.set(item.date, { ...item })
      else for (const key of dailyKeys) day[key] += item[key]
    }
  }
  return {
    taxBasis: 'before-tax', period: { ...first.period },
    metrics: {
      billedSales: billed, sales, previousSales, salesChangePercentage: reportChange(sales, previousSales),
      materialPurchases: material, previousMaterialPurchases: previousMaterial, materialPurchasesChangePercentage: reportChange(material, previousMaterial),
      operatingExpenses: operating, previousOperatingExpenses: previousOperating, operatingExpensesChangePercentage: reportChange(operating, previousOperating),
      grossProfit: sales - material, previousGrossProfit: previousSales - previousMaterial, grossMarginPercentage: reportPercentage(sales - material, sales),
      netProfit: net, previousNetProfit: previousNet, netMarginPercentage: reportPercentage(net, sales), previousNetMarginPercentage: reportPercentage(previousNet, previousSales),
      previousDays: first.metrics.previousDays, collections: sum('collections'), netCashFlow: sum('collections') - material - operating,
      orderCount: count, averageTicket: count ? sales / count : 0,
      outstandingBalance: outstanding, collectionCoveragePercentage: reportPercentage(billed - outstanding, billed) ?? 0
    },
    dailyMovements: [...movements.values()].sort((a, b) => a.date.localeCompare(b.date)),
    paymentMethods: breakdown('paymentMethods'), operatingExpenseCategories: breakdown('operatingExpenseCategories'),
    salesByLine: breakdown('salesByLine'), salesByWorkshop: breakdown('salesByWorkshop'),
    salesChannels: [...channels.values()]
      .sort((a, b) => ['counter', 'seller', 'internal', 'workshop'].indexOf(a.key) - ['counter', 'seller', 'internal', 'workshop'].indexOf(b.key))
      .map(channel => ({ ...channel, percentage: reportPercentage(channel.amount, sales) ?? 0 })),
    topCustomers: ranking('topCustomers', sales), topDebtors: ranking('topDebtors', outstanding),
    topServices: ranking('topServices', sales), topMaterialProviders: ranking('topMaterialProviders', material)
  }
}
