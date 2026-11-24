import { calendarDaysInclusive, parseCalendarDateKey, utcPeriodBounds } from '@rafamedtech/nuxt-shared/utils'
import type { ReportPeriod } from '../app/types/reports'
import { reportDateKey } from './report'

export function resolveReportPeriod(query: Record<string, unknown>, now = new Date(), timeZone = 'America/Tijuana') {
  if (query.view !== undefined && query.view !== 'annual' && query.view !== 'monthly') throw new Error('Vista inválida.')
  const today = reportDateKey(now, timeZone)
  const annual = query.view === 'annual'
  const startKey = typeof query.from === 'string' ? query.from : annual ? `${today.slice(0, 4)}-01-01` : `${today.slice(0, 7)}-01`
  const endKey = typeof query.to === 'string' ? query.to : today
  const defaultBounds = utcPeriodBounds(Number(today.slice(0, 4)), annual ? undefined : Number(today.slice(5, 7)))
  const fullEndKey = typeof query.monthEnd === 'string'
    ? query.monthEnd
    : new Date(defaultBounds.end.getTime() - 1).toISOString().slice(0, 10)
  if (![startKey, endKey, fullEndKey].every(parseCalendarDateKey)
    || startKey > endKey || endKey > fullEndKey || endKey > today
    || !startKey.endsWith('-01')
    || (annual ? !startKey.endsWith('-01-01') || fullEndKey !== `${startKey.slice(0, 4)}-12-31` : startKey.slice(0, 7) !== fullEndKey.slice(0, 7))) {
    throw new Error('Rango de fechas inválido.')
  }
  const dayCount = (end: string) => calendarDaysInclusive(startKey, end)
  const period: ReportPeriod = {
    mode: annual ? 'annual' : 'monthly', start: startKey, end: endKey,
    label: `${startKey.split('-').reverse().join('/')} – ${endKey.split('-').reverse().join('/')}`,
    elapsedDays: dayCount(endKey), totalDays: dayCount(fullEndKey)
  }
  return { startKey, endKey, fullEndKey, annual, period }
}
