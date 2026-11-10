export function reportChange(current: number, previous: number): number | null {
  return previous === 0 ? null : Math.round((current - previous) / Math.abs(previous) * 1000) / 10
}

export function reportPercentage(amount: number, total: number): number | null {
  return total > 0 ? Math.round(amount / total * 1000) / 10 : null
}

export function reportDateKey(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone
  }).formatToParts(date)
  const part = (type: string) => parts.find(item => item.type === type)!.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

// Convert a workshop calendar day to an instant, including daylight saving changes.
export function reportDayStart(day: string, timeZone: string) {
  const target = new Date(`${day}T00:00:00Z`).getTime()
  let instant = target
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date(instant))
    const part = (type: string) => Number(parts.find(item => item.type === type)!.value)
    const local = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second'))
    instant += target - local
  }
  return new Date(instant)
}

export function reportNextDay(day: string) {
  const date = new Date(`${day}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

export function reportPreviousPeriod(start: string, annual: boolean) {
  const date = new Date(`${start}T12:00:00Z`)
  if (annual) date.setUTCFullYear(date.getUTCFullYear() - 1)
  else date.setUTCMonth(date.getUTCMonth() - 1)
  return date.toISOString().slice(0, 10)
}
