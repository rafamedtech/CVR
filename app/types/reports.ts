import type { ReportBreakdownItem, ReportDailyMovement, ReportPeriod, ReportRankingItem } from '@rafamedtech/nuxt-shared/utils'

export type { ReportBreakdownItem, ReportDailyMovement, ReportPeriod, ReportRankingItem }

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

export interface CarolinaInventoryValuation {
  totals: Array<{ currencyCode: string, amount: number }>
  productsWithoutCost: number
  warehouses: Array<{ id: string, code: string, name: string, totals: CarolinaInventoryValuation['totals'], productsWithoutCost: number }>
}

export interface ConsolidationInfo {
  carolinaInventory?: CarolinaInventoryValuation | null
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
