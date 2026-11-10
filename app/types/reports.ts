export interface ReportPeriod {
  mode: 'monthly' | 'annual'
  label: string
  start: string
  end: string
  elapsedDays: number
  totalDays: number
}

export interface ReportMetrics {
  billedSales: number
  sales: number
  previousSales: number
  salesChangePercentage: number | null
  materialPurchases: number
  previousMaterialPurchases: number
  materialPurchasesChangePercentage: number | null
  operatingExpenses: number
  previousOperatingExpenses: number
  operatingExpensesChangePercentage: number | null
  grossProfit: number
  previousGrossProfit: number
  grossMarginPercentage: number | null
  netProfit: number
  previousNetProfit: number
  netMarginPercentage: number | null
  previousNetMarginPercentage: number | null
  previousDays: number
  collections: number
  netCashFlow: number
  orderCount: number
  averageTicket: number
  outstandingBalance: number
  collectionCoveragePercentage: number
}

export interface ReportDailyMovement {
  date: string
  label: string
  sales: number
  orderCount: number
  collections: number
  expenses: number
  netCashFlow: number
  materialPurchases: number
  operatingExpenses: number
  netProfit: number
}

export interface ReportBreakdownItem {
  key: string
  label: string
  amount: number
  count: number
  percentage: number
}

export interface ReportRankingItem {
  id: string
  label: string
  detail: string
  amount: number
  count: number
  percentage: number
}

export type ReportSalesChannelKey = 'counter' | 'seller' | 'internal' | 'workshop'

export interface ReportSalesChannel extends ReportBreakdownItem {
  key: ReportSalesChannelKey
  previousAmount: number
}

export interface BusinessReportSummary {
  taxBasis?: 'before-tax' | 'as-recorded'
  period: ReportPeriod
  metrics: ReportMetrics
  dailyMovements: ReportDailyMovement[]
  paymentMethods: ReportBreakdownItem[]
  operatingExpenseCategories: ReportBreakdownItem[]
  topMaterialProviders: ReportRankingItem[]
  topDebtors: ReportRankingItem[]
  topCustomers: ReportRankingItem[]
  topServices: ReportRankingItem[]
  salesByLine: ReportBreakdownItem[]
  salesByWorkshop: ReportBreakdownItem[]
  salesChannels?: ReportSalesChannel[]
}

export interface ConsolidationInfo {
  status: 'connected' | 'not-configured' | 'unavailable'
  businesses: Array<{ id: string, name: string, metrics: ReportMetrics }>
  internalOperations: {
    sales: number
    previousSales: number
    orderCount: number
    collections: number
    outstandingBalance: number
    workshopMaterialPurchases: number
  } | null
}

export interface BusinessReportData {
  business: string
  businessName: string
  report: BusinessReportSummary | null
  consolidation: ConsolidationInfo | null
  status: 'connected' | 'not-configured' | 'unavailable'
}
