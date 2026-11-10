const dateValue = (value: string) => new Date(value.length === 10 ? `${value}T12:00:00Z` : value)
export function reportFormatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(dateValue(value))
}
export function formatMonth(value: string) {
  return new Intl.DateTimeFormat('es-MX', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(dateValue(value))
}
export function formatDateRange(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  return `${formatter.format(dateValue(start))} – ${formatter.format(dateValue(end))}`
}
