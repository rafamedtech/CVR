export function formatDateOnly(value: string | null) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeZone: 'UTC'
  }).format(new Date(value))
}
