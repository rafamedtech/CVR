import { addCalendarDays, calendarDateKeyInTimeZone, localCalendarBounds, previousCalendarPeriod } from '@rafamedtech/nuxt-shared/utils'

export { reportPercentage, reportPercentageChange as reportChange } from '@rafamedtech/nuxt-shared/utils'

export const reportDateKey = calendarDateKeyInTimeZone

export function reportDayStart(day: string, timeZone: string) {
  return localCalendarBounds(day, day, timeZone).start
}

export function reportNextDay(day: string) {
  return addCalendarDays(day, 1)
}

export function reportDayEnd(day: string, timeZone: string) {
  return new Date(localCalendarBounds(day, day, timeZone).end.getTime() - 1)
}

export const reportPreviousPeriod = previousCalendarPeriod
