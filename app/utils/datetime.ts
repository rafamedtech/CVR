import { createDateFormatters, type DateInput } from '@rafamedtech/nuxt-shared/utils'

export const DEFAULT_WORKSHOP_TIME_ZONE = 'America/Tijuana'

const reportDates = createDateFormatters({
  timeZone: 'UTC',
  date: { day: 'numeric', month: 'short', year: 'numeric' },
  month: { month: 'short', year: 'numeric' }
})

export const reportFormatDate = reportDates.formatDate
export const formatMonth = reportDates.formatMonth
export const formatReportPeriod = reportDates.formatDateRange

export function formatDateRange(start: string, end: string) {
  return reportDates.formatDateRange(start, end, reportDates.formatDayMonth)
}

const reportMonthDates = createDateFormatters({ timeZone: 'UTC' })
const reportTrendDates = createDateFormatters({ timeZone: 'UTC', date: { dateStyle: 'long' } })

export const formatReportMonth = reportMonthDates.formatMonth
export const formatTrendDate = reportTrendDates.formatDate
export const formatTrendDayMonth = reportTrendDates.formatDayMonth

const workshopFormatters = new Map<string, ReturnType<typeof createDateFormatters>>()
const dashboardFormatters = new Map<string, ReturnType<typeof createDateFormatters>>()

function workshopDates(timeZone: string) {
  let dates = workshopFormatters.get(timeZone)
  if (!dates) {
    dates = createDateFormatters({ timeZone })
    workshopFormatters.set(timeZone, dates)
  }
  return dates
}

export function formatWorkshopDate(value: DateInput, withTime = false, timeZone = DEFAULT_WORKSHOP_TIME_ZONE) {
  const dates = workshopDates(timeZone)
  return withTime ? dates.formatDateTime(value) : dates.formatDate(value)
}

export function formatWorkshopDayMonth(value: DateInput, timeZone = DEFAULT_WORKSHOP_TIME_ZONE) {
  return workshopDates(timeZone).formatDayMonth(value)
}

export function formatDashboardUpdatedAt(value: DateInput, timeZone: string) {
  let dates = dashboardFormatters.get(timeZone)
  if (!dates) {
    const dayMonth = { day: 'numeric', month: 'short' } as const
    dates = createDateFormatters({
      timeZone,
      date: dayMonth,
      dateTime: { ...dayMonth, hour: '2-digit', minute: '2-digit' }
    })
    dashboardFormatters.set(timeZone, dates)
  }
  return dates.formatDateTime(value)
}
