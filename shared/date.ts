import { createDateFormatters } from '@rafamedtech/nuxt-shared/utils'

// Gastos guarda las fechas de calendario históricas a medianoche UTC.
const calendarDates = createDateFormatters({ timeZone: 'UTC' })

export const formatDateOnly = calendarDates.formatDate
export const formatCalendarRange = calendarDates.formatDateRange
