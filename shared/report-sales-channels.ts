import type { ConsolidationInfo, ReportSalesChannel } from '../app/types/reports'
import { reportPercentage } from './report'

export type SalesChannelRow = Omit<ReportSalesChannel, 'key'> & { key: string }

export function groupBusinessSalesChannels(channels: ReportSalesChannel[], businesses: ConsolidationInfo['businesses']) {
  const carolina = channels.filter(channel => channel.key !== 'workshop')
  const carolinaTotal = carolina.reduce((sum, channel) => sum + channel.amount, 0)
  const workshops = businesses.filter(business => business.id !== 'carolina-pinturas')
  const workshopTotal = workshops.reduce((sum, business) => sum + business.metrics.sales, 0)

  return {
    carolina: carolina.map(channel => ({
      ...channel,
      percentage: reportPercentage(channel.amount, carolinaTotal) ?? 0
    })),
    workshops: workshops.map(business => ({
      key: business.id,
      label: business.name,
      amount: business.metrics.sales,
      count: business.metrics.orderCount,
      previousAmount: business.metrics.previousSales,
      percentage: reportPercentage(business.metrics.sales, workshopTotal) ?? 0
    })) satisfies SalesChannelRow[]
  }
}
